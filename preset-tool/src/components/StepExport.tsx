import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../storeContext';
import { highlightJSON } from '../utils/parser';
import { SillyTavernPreset } from '../types';
import { Copy, Download, Check, FileCode, AlertTriangle, Upload, FileUp, Eye, ArrowDownToLine, X } from 'lucide-react';

type ImportedFileData = {
  fileName: string;
  fileType: 'preset' | 'regex' | 'regex_array' | 'unknown';
  data: unknown;
  rawJSON: string;
};

function detectFileType(data: unknown): 'preset' | 'regex' | 'regex_array' | 'unknown' {
  if (!data || typeof data !== 'object') return 'unknown';

  // Array of regex scripts
  if (Array.isArray(data)) {
    const looksLikeRegexArray = data.length > 0 && data.every(
      (item: unknown) => item && typeof item === 'object' && ('findRegex' in (item as Record<string, unknown>) || 'scriptName' in (item as Record<string, unknown>))
    );
    if (looksLikeRegexArray) return 'regex_array';
    return 'unknown';
  }

  const obj = data as Record<string, unknown>;

  // Full Preset: has prompts array or temperature+impersonation_prompt
  if (
    ('prompts' in obj && Array.isArray(obj.prompts)) ||
    ('temperature' in obj && 'impersonation_prompt' in obj)
  ) {
    return 'preset';
  }

  // Single Regex Script
  if ('findRegex' in obj && 'replaceString' in obj) {
    return 'regex';
  }

  // Could be a preset with just parameters (no prompts)
  if ('temperature' in obj && ('top_p' in obj || 'top_k' in obj || 'min_p' in obj)) {
    return 'preset';
  }

  return 'unknown';
}

function getFileTypeLabel(type: string): string {
  switch (type) {
    case 'preset': return '🎭 SillyTavern Preset';
    case 'regex': return '🔍 Regex Script';
    case 'regex_array': return '🔍 Danh sách Regex Scripts';
    default: return '❓ Không xác định';
  }
}

export const StepExport: React.FC = () => {
  const { activeProject, addToast, addPromptBlock, addRegexScript, updatePresetParams } = useApp();
  
  // Tab within Export step: 'preset' or index of regex
  const [activeTab, setActiveTab] = useState<'preset' | number>('preset');
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importedFile, setImportedFile] = useState<ImportedFileData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presetJSON = activeProject.preset;
  const regexes = activeProject.regexes;

  // Build clean Preset JSON strictly conforming to SillyTavern schema
  const cleanPreset = {
    ...presetJSON,
    // Add default schema additions if not exist
    prompt_order: presetJSON.prompts.map(p => ({
      identifier: p.identifier,
      enabled: p.enabled
    })),
    extensions: {
      SPreset: activeProject.name
    }
  };

  const activeJSONData = activeTab === 'preset' 
    ? cleanPreset 
    : regexes[activeTab as number];

  const activeName = activeTab === 'preset'
    ? activeProject.name
    : regexes[activeTab as number]?.scriptName || 'regex_script';

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(activeJSONData, null, 2));
    setCopied(true);
    addToast("Đã sao chép vào bộ nhớ tạm!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const jsonStr = JSON.stringify(activeJSONData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Normalize filename
    const cleanName = activeName.toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .replace(/\s+/g, '_');
      
    a.href = url;
    a.download = `${cleanName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Đã tải về file ${cleanName}.json`, "success");
  };

  // === FILE IMPORT LOGIC ===
  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      addToast("Chỉ hỗ trợ file .json!", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const fileType = detectFileType(parsed);
        
        setImportedFile({
          fileName: file.name,
          fileType,
          data: parsed,
          rawJSON: content,
        });
        setShowPreview(true);
        addToast(`Đã đọc file "${file.name}" thành công!`, "success");
      } catch {
        addToast(`File "${file.name}" không phải JSON hợp lệ!`, "error");
      }
    };
    reader.onerror = () => {
      addToast("Không thể đọc file!", "error");
    };
    reader.readAsText(file);
  }, [addToast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input value so same file can be re-selected
    e.target.value = '';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImportConfirm = () => {
    if (!importedFile) return;

    const data = importedFile.data;
    let addedPrompts = 0;
    let addedRegexes = 0;

    if (importedFile.fileType === 'preset') {
      const pObj = data as Record<string, unknown>;

      // Add prompts from file
      if (Array.isArray(pObj.prompts)) {
        (pObj.prompts as Record<string, unknown>[]).forEach((p) => {
          addPromptBlock({
            name: String(p.name || 'Prompt Block'),
            identifier: String(p.identifier || p.name || 'prompt-' + Math.random().toString(36).substring(7)),
            role: (p.role === 'user' || p.role === 'assistant' ? p.role : 'system') as 'system' | 'user' | 'assistant',
            system_prompt: typeof p.system_prompt === 'boolean' ? p.system_prompt : true,
            content: String(p.content || ''),
            enabled: typeof p.enabled === 'boolean' ? p.enabled : true,
            injection_position: typeof p.injection_position === 'number' ? p.injection_position : 0,
            injection_depth: typeof p.injection_depth === 'number' ? p.injection_depth : 4,
            injection_order: typeof p.injection_order === 'number' ? p.injection_order : 100,
            forbid_overrides: typeof p.forbid_overrides === 'boolean' ? p.forbid_overrides : false,
          });
          addedPrompts++;
        });
      }

      // Add regex_scripts from preset (check both root and extensions.regex_scripts)
      const ext = pObj.extensions as Record<string, unknown> | undefined;
      const rawRegexScripts = Array.isArray(pObj.regex_scripts) ? pObj.regex_scripts
        : (ext && Array.isArray(ext.regex_scripts)) ? ext.regex_scripts
        : [];
      if (rawRegexScripts.length > 0) {
        (rawRegexScripts as Record<string, unknown>[]).forEach((r) => {
          addRegexScript({
            scriptName: String(r.scriptName || 'Regex Script'),
            findRegex: String(r.findRegex || ''),
            replaceString: String(r.replaceString || ''),
            trimStrings: Array.isArray(r.trimStrings) ? r.trimStrings.map(String) : [],
            placement: Array.isArray(r.placement) ? r.placement.filter((v): v is number => typeof v === 'number') : [2],
            disabled: typeof r.disabled === 'boolean' ? r.disabled : false,
            markdownOnly: typeof r.markdownOnly === 'boolean' ? r.markdownOnly : true,
            promptOnly: typeof r.promptOnly === 'boolean' ? r.promptOnly : false,
            runOnEdit: typeof r.runOnEdit === 'boolean' ? r.runOnEdit : true,
            substituteRegex: typeof r.substituteRegex === 'number' ? r.substituteRegex : 0,
            minDepth: typeof r.minDepth === 'number' ? r.minDepth : null,
            maxDepth: typeof r.maxDepth === 'number' ? r.maxDepth : null,
            id: String(r.id || undefined),
          });
          addedRegexes++;
        });
      }

      // Optionally update preset parameters (non-prompt fields)
      const paramUpdates: Record<string, unknown> = {};
      const paramKeys = ['temperature', 'frequency_penalty', 'presence_penalty', 'top_p', 'top_k', 'top_a', 'min_p',
        'repetition_penalty', 'openai_max_context', 'openai_max_tokens', 'wrap_in_quotes', 'names_behavior',
        'send_if_empty', 'impersonation_prompt', 'new_chat_prompt', 'new_group_chat_prompt',
        'new_example_chat_prompt', 'continue_nudge_prompt', 'bias_preset_selected', 'max_context_unlocked',
        'wi_format', 'scenario_format', 'personality_format', 'group_nudge_prompt', 'stream_openai'];
      paramKeys.forEach(key => {
        if (key in pObj) paramUpdates[key] = pObj[key];
      });
      if (Object.keys(paramUpdates).length > 0) {
        updatePresetParams(paramUpdates as Partial<SillyTavernPreset>);
      }

      addToast(`Đã thêm ${addedPrompts} prompt blocks${addedRegexes > 0 ? ` và ${addedRegexes} regex scripts` : ''} vào dự án!`, 'success');

    } else if (importedFile.fileType === 'regex') {
      const r = data as Record<string, unknown>;
      addRegexScript({
        scriptName: String(r.scriptName || 'Regex Script'),
        findRegex: String(r.findRegex || ''),
        replaceString: String(r.replaceString || ''),
        trimStrings: Array.isArray(r.trimStrings) ? r.trimStrings.map(String) : [],
        placement: Array.isArray(r.placement) ? r.placement.filter((v): v is number => typeof v === 'number') : [2],
        disabled: typeof r.disabled === 'boolean' ? r.disabled : false,
        markdownOnly: typeof r.markdownOnly === 'boolean' ? r.markdownOnly : true,
        promptOnly: typeof r.promptOnly === 'boolean' ? r.promptOnly : false,
        runOnEdit: typeof r.runOnEdit === 'boolean' ? r.runOnEdit : true,
        substituteRegex: typeof r.substituteRegex === 'number' ? r.substituteRegex : 0,
        minDepth: typeof r.minDepth === 'number' ? r.minDepth : null,
        maxDepth: typeof r.maxDepth === 'number' ? r.maxDepth : null,
        id: String(r.id || undefined),
      });
      addToast(`Đã thêm Regex Script vào dự án!`, 'success');

    } else if (importedFile.fileType === 'regex_array') {
      const arr = data as Record<string, unknown>[];
      arr.forEach((r) => {
        addRegexScript({
          scriptName: String(r.scriptName || 'Regex Script'),
          findRegex: String(r.findRegex || ''),
          replaceString: String(r.replaceString || ''),
          trimStrings: Array.isArray(r.trimStrings) ? r.trimStrings.map(String) : [],
          placement: Array.isArray(r.placement) ? r.placement.filter((v): v is number => typeof v === 'number') : [2],
          disabled: typeof r.disabled === 'boolean' ? r.disabled : false,
          markdownOnly: typeof r.markdownOnly === 'boolean' ? r.markdownOnly : true,
          promptOnly: typeof r.promptOnly === 'boolean' ? r.promptOnly : false,
          runOnEdit: typeof r.runOnEdit === 'boolean' ? r.runOnEdit : true,
          substituteRegex: typeof r.substituteRegex === 'number' ? r.substituteRegex : 0,
          minDepth: typeof r.minDepth === 'number' ? r.minDepth : null,
          maxDepth: typeof r.maxDepth === 'number' ? r.maxDepth : null,
          id: String(r.id || undefined),
        });
      });
      addToast(`Đã thêm ${arr.length} Regex Scripts vào dự án!`, 'success');

    } else {
      addToast('Không nhận diện được loại dữ liệu trong file.', 'error');
    }

    setImportedFile(null);
    setShowPreview(false);
  };

  const handleCancelImport = () => {
    setImportedFile(null);
    setShowPreview(false);
  };

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      
      {/* === IMPORT SECTION === */}
      <div className="bg-theme-panel border border-theme-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-theme-border bg-gray-900/40">
          <Upload size={16} className="text-emerald-400" />
          <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Nhập Preset / Regex từ File JSON</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 group ${
              isDragOver
                ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                : 'border-gray-700 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className={`inline-flex items-center justify-center p-3 rounded-full mb-3 transition-colors duration-300 ${
              isDragOver
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-gray-800 text-gray-400 group-hover:bg-emerald-500/15 group-hover:text-emerald-400'
            }`}>
              <FileUp size={28} />
            </div>
            
            <p className={`text-sm font-bold transition-colors ${isDragOver ? 'text-emerald-300' : 'text-gray-300'}`}>
              {isDragOver ? 'Thả file vào đây!' : 'Kéo thả file JSON hoặc nhấp để chọn'}
            </p>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Hỗ trợ SillyTavern Preset (.json) và Regex Script (.json)
            </p>
          </div>

          {/* Import Preview Modal */}
          {showPreview && importedFile && (
            <div className="bg-gray-900/80 border border-theme-border rounded-xl overflow-hidden animate-slide-up">
              {/* Preview Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border bg-gray-900/60">
                <div className="flex items-center gap-2.5">
                  <Eye size={14} className="text-amber-400" />
                  <div>
                    <span className="block text-xs font-bold text-gray-200">{importedFile.fileName}</span>
                    <span className={`block text-[10px] font-bold mt-0.5 ${
                      importedFile.fileType === 'preset' ? 'text-purple-400' 
                      : importedFile.fileType === 'regex' || importedFile.fileType === 'regex_array' ? 'text-cyan-400' 
                      : 'text-amber-400'
                    }`}>
                      {getFileTypeLabel(importedFile.fileType)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCancelImport}
                  className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Preview Summary */}
              <div className="px-4 py-3 space-y-2">
                {importedFile.fileType === 'preset' && (() => {
                  const pObj = importedFile.data as Record<string, unknown>;
                  const ext = pObj.extensions as Record<string, unknown> | undefined;
                  const regexCount = Array.isArray(pObj.regex_scripts) ? (pObj.regex_scripts as unknown[]).length
                    : (ext && Array.isArray(ext.regex_scripts)) ? (ext.regex_scripts as unknown[]).length
                    : 0;
                  return (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 bg-gray-950/50 rounded-lg border border-theme-border/40">
                        <span className="block text-[9px] text-gray-500 uppercase font-bold">Khối Prompts</span>
                        <span className="block text-xs font-bold text-purple-400 mt-0.5">
                          {Array.isArray(pObj.prompts) ? (pObj.prompts as unknown[]).length : 0} blocks
                        </span>
                      </div>
                      <div className="p-2.5 bg-gray-950/50 rounded-lg border border-theme-border/40">
                        <span className="block text-[9px] text-gray-500 uppercase font-bold">Regex Scripts</span>
                        <span className="block text-xs font-bold text-cyan-400 mt-0.5">
                          {regexCount} scripts
                        </span>
                      </div>
                      <div className="p-2.5 bg-gray-950/50 rounded-lg border border-theme-border/40">
                        <span className="block text-[9px] text-gray-500 uppercase font-bold">Temperature</span>
                        <span className="block text-xs font-bold text-green-400 mt-0.5">
                          {typeof pObj.temperature === 'number' ? String(pObj.temperature) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                {importedFile.fileType === 'regex_array' && (
                  <div className="p-2.5 bg-gray-950/50 rounded-lg border border-theme-border/40">
                    <span className="block text-[9px] text-gray-500 uppercase font-bold">Số Regex Scripts</span>
                    <span className="block text-xs font-bold text-cyan-400 mt-0.5">
                      {Array.isArray(importedFile.data) ? importedFile.data.length : 0} scripts
                    </span>
                  </div>
                )}
                {importedFile.fileType === 'regex' && (
                  <div className="p-2.5 bg-gray-950/50 rounded-lg border border-theme-border/40">
                    <span className="block text-[9px] text-gray-500 uppercase font-bold">Script Name</span>
                    <span className="block text-xs font-bold text-cyan-400 mt-0.5">
                      {String((importedFile.data as Record<string, unknown>)?.scriptName || 'N/A')}
                    </span>
                  </div>
                )}
              </div>

              {/* Preview JSON (collapsed) */}
              <details className="mx-4 mb-3">
                <summary className="text-[10px] text-gray-500 font-bold uppercase cursor-pointer hover:text-gray-300 transition py-1.5">
                  ▸ Xem trước JSON ({(importedFile.rawJSON.length / 1024).toFixed(1)} KB)
                </summary>
                <div className="mt-2 p-3 bg-gray-950 rounded-lg border border-theme-border/30 overflow-y-auto max-h-[250px] font-mono text-[11px] leading-relaxed select-text">
                  <pre 
                    className="whitespace-pre"
                    dangerouslySetInnerHTML={{ __html: highlightJSON(importedFile.data as object) }}
                  />
                </div>
              </details>

              {/* Actions */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-theme-border bg-gray-900/30">
                {importedFile.fileType === 'unknown' && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 flex-1">
                    <AlertTriangle size={12} />
                    <span>Không xác định được loại file. Sẽ thử nhập như Preset.</span>
                  </div>
                )}
                <div className="flex-1" />
                <button
                  onClick={handleCancelImport}
                  className="px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 border border-theme-border rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleImportConfirm}
                  className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition shadow-lg shadow-emerald-500/10"
                >
                  <ArrowDownToLine size={13} />
                  {importedFile.fileType === 'preset' 
                    ? 'Thêm Prompts & Regex Vào Dự Án' 
                    : importedFile.fileType === 'regex' || importedFile.fileType === 'regex_array'
                      ? 'Thêm Regex Vào Dự Án'
                      : 'Nhập Vào Dự Án'
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overview stats */}
      <div className="bg-theme-panel border border-theme-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3 bg-gray-900/40 rounded-lg border border-theme-border/50 space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Tên Dự Án</span>
          <span className="block text-xs font-bold text-gray-200 truncate">{activeProject.name}</span>
        </div>
        <div className="p-3 bg-gray-900/40 rounded-lg border border-theme-border/50 space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Khối Chỉ Thị (Prompts)</span>
          <span className="block text-xs font-bold text-purple-400">{presetJSON.prompts.length} blocks</span>
        </div>
        <div className="p-3 bg-gray-900/40 rounded-lg border border-theme-border/50 space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Bộ lọc Regex (Regexes)</span>
          <span className="block text-xs font-bold text-cyan-400">{regexes.length} scripts</span>
        </div>
      </div>

      {/* Tabs & Code view */}
      <div className="bg-theme-panel border border-theme-border rounded-xl overflow-hidden flex flex-col h-[550px]">
        {/* Tab Header bar */}
        <div className="flex border-b border-theme-border bg-gray-900/60 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('preset')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'preset'
                ? 'border-purple-400 text-purple-400 bg-purple-500/[0.03]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileCode size={14} />
            Preset JSON
          </button>
          
          {regexes.map((reg, idx) => (
            <button
              key={reg.id}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === idx
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/[0.03]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileCode size={14} />
              Regex: {reg.scriptName}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center px-4 py-2.5 bg-gray-900/30 border-b border-theme-border/50 text-xs">
          <span className="text-gray-500 font-mono">
            {activeTab === 'preset' ? 'sillytavern_preset_schema.json' : 'sillytavern_regex_schema.json'}
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-2.5 py-1.5 rounded-lg border border-theme-border transition"
            >
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-semibold px-2.5 py-1.5 rounded-lg transition shadow-md shadow-purple-500/10"
            >
              <Download size={13} />
              Tải xuống .json
            </button>
          </div>
        </div>

        {/* Syntax-highlighted Viewport */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-950 font-mono text-xs leading-relaxed select-text">
          {activeTab !== 'preset' && !activeJSONData ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
              <AlertTriangle size={24} className="text-amber-500" />
              <span>Regex Script không tồn tại hoặc đã bị xóa.</span>
            </div>
          ) : (
            <pre 
              className="whitespace-pre"
              dangerouslySetInnerHTML={{ __html: highlightJSON(activeJSONData) }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
