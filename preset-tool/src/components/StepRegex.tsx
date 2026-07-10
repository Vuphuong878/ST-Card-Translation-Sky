import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../storeContext';
import { RegexScript } from '../types';
import { Plus, Trash2, Edit3, Save, Eye, EyeOff, FileUp, Code, Upload, X } from 'lucide-react';
import { t, fmt } from '../i18n';

export const StepRegex: React.FC = () => {
  const { 
    activeProject, 
    addRegexScript, 
    updateRegexScript, 
    deleteRegexScript, 
    addToast 
  } = useApp();

  const regexes = activeProject.regexes;

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RegexScript>>({});

  // Adding state
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState<Omit<RegexScript, 'id'>>({
    scriptName: '',
    findRegex: '',
    replaceString: '',
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  });

  const handleStartEdit = (r: RegexScript) => {
    setEditingId(r.id);
    setEditForm({ ...r });
  };

  const handleSaveEdit = () => {
    if (editingId) {
      if (!editForm.scriptName?.trim()) {
        addToast(t.rxToastNameEmpty, "warning");
        return;
      }
      if (!editForm.findRegex?.trim()) {
        addToast(t.rxToastPatternEmpty, "warning");
        return;
      }
      updateRegexScript(editingId, editForm);
      setEditingId(null);
      addToast(t.rxToastSaved, "success");
    }
  };

  const handleAddRegex = () => {
    if (!newForm.scriptName.trim()) {
      addToast(t.rxToastNameEmpty, "warning");
      return;
    }
    if (!newForm.findRegex.trim()) {
      addToast(t.rxToastPatternEmpty, "warning");
      return;
    }
    addRegexScript(newForm);
    setIsAdding(false);
    setNewForm({
      scriptName: '',
      findRegex: '',
      replaceString: '',
      trimStrings: [],
      placement: [2],
      disabled: false,
      markdownOnly: true,
      promptOnly: false,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
    });
  };

  const togglePlacement = (val: number, isNew: boolean = false) => {
    if (isNew) {
      const current = newForm.placement;
      const updated = current.includes(val) ? current.filter(x => x !== val) : [...current, val];
      setNewForm(prev => ({ ...prev, placement: updated }));
    } else {
      const current = editForm.placement || [];
      const updated = current.includes(val) ? current.filter(x => x !== val) : [...current, val];
      setEditForm(prev => ({ ...prev, placement: updated }));
    }
  };

  // ── JSON Import Logic ──
  const [showImport, setShowImport] = useState(false);
  const [importJSON, setImportJSON] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseAndImportRegex = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);

      // Array of regex scripts
      if (Array.isArray(parsed)) {
        let count = 0;
        parsed.forEach((item: unknown) => {
          if (item && typeof item === 'object' && 'findRegex' in (item as Record<string, unknown>)) {
            const r = item as Record<string, unknown>;
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
            count++;
          }
        });
        if (count > 0) {
          addToast(fmt(t.rxToastImported, { count }), 'success');
          setImportJSON('');
          setShowImport(false);
        } else {
          addToast(t.rxToastNoneInArray, 'error');
        }
        return;
      }

      // Single regex script
      if (parsed && typeof parsed === 'object' && ('findRegex' in parsed || 'scriptName' in parsed)) {
        const r = parsed as Record<string, unknown>;
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
        setImportJSON('');
        setShowImport(false);
        return;
      }

      addToast(t.rxToastNotRegex, 'error');
    } catch {
      addToast(t.rxToastBadJson, 'error');
    }
  }, [addRegexScript, addToast]);

  const handleFileImport = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      addToast(t.toastOnlyJson, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setImportJSON(content);
        setShowImport(true);
        // Auto-import immediately
        parseAndImportRegex(content);
      }
    };
    reader.readAsText(file);
  }, [addToast, parseAndImportRegex]);

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
    if (file) handleFileImport(file);
  }, [handleFileImport]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileImport(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      
      {/* Step Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-theme-panel border border-theme-border rounded-xl p-4">
        <div>
          <h3 className="text-sm font-semibold text-cyan-400">{t.rxHeader}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {t.rxSubtitleA}<span className="text-cyan-400 font-bold">{regexes.length}</span>{t.rxSubtitleB}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className={`flex items-center gap-1.5 font-semibold text-xs px-3.5 py-2 rounded-lg transition shadow-md ${
              showImport
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/5'
            }`}
          >
            <Upload size={14} />
            {t.rxImportJson}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition shadow-md shadow-cyan-500/10"
          >
            <Plus size={14} />
            {t.rxAddNew}
          </button>
        </div>
      </div>

      {/* ══ JSON IMPORT SECTION ══ */}
      {showImport && (
        <div className="bg-theme-panel border border-emerald-500/30 rounded-xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-5 py-3 border-b border-theme-border bg-gray-900/40">
            <div className="flex items-center gap-2">
              <Code size={14} className="text-emerald-400" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">{t.rxImportTitle}</span>
            </div>
            <button onClick={() => { setShowImport(false); setImportJSON(''); }} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition">
              <X size={14} />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
            {/* File drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-all group ${
                isDragOver
                  ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                  : 'border-gray-700 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03]'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
              <FileUp size={22} className={`inline-block mb-2 transition-colors ${isDragOver ? 'text-emerald-300' : 'text-gray-500 group-hover:text-emerald-400'}`} />
              <p className={`text-xs font-bold ${isDragOver ? 'text-emerald-300' : 'text-gray-400'}`}>
                {isDragOver ? t.rxDropActive : t.rxDropIdle}
              </p>
            </div>

            {/* JSON paste textarea */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400">{t.rxPasteLabel}</label>
              <textarea
                rows={8}
                value={importJSON}
                onChange={(e) => setImportJSON(e.target.value)}
                placeholder={t.rxPastePh}
                className="w-full bg-gray-950 border border-theme-border rounded-lg p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-400 resize-y leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowImport(false); setImportJSON(''); }}
                className="text-xs font-semibold text-gray-400 hover:text-gray-200 px-3 py-2 rounded-lg transition"
              >
                {t.rxCancel}
              </button>
              <button
                onClick={() => { if (importJSON.trim()) parseAndImportRegex(importJSON); else addToast(t.rxToastNoJson, 'warning'); }}
                disabled={!importJSON.trim()}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-lg shadow-emerald-500/10"
              >
                <Upload size={13} />
                {t.rxImportBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Regex Form */}
      {isAdding && (
        <div className="bg-theme-panel border border-cyan-500/30 rounded-xl p-5 space-y-4 animate-fade-in">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{t.rxNewTitle}</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="add-r-name" className="block text-xs font-semibold text-gray-400">{t.rxName}</label>
              <input
                id="add-r-name"
                type="text"
                value={newForm.scriptName}
                onChange={(e) => setNewForm(prev => ({ ...prev, scriptName: e.target.value }))}
                placeholder={t.rxNamePh}
                className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="add-r-pattern" className="block text-xs font-semibold text-gray-400">{t.rxPattern}</label>
              <textarea
                id="add-r-pattern"
                rows={2}
                value={newForm.findRegex}
                onChange={(e) => setNewForm(prev => ({ ...prev, findRegex: e.target.value }))}
                placeholder={t.rxPatternPh}
                className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 resize-y"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900/40 p-3 rounded-lg border border-theme-border/50">
            {/* Placement checkbox */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-gray-500 uppercase">{t.rxPlacement}</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newForm.placement.includes(1)}
                    onChange={() => togglePlacement(1, true)}
                    className="rounded text-cyan-400 bg-gray-900 border-theme-border w-3.5 h-3.5"
                  />
                  {t.rxUserInput1}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newForm.placement.includes(2)}
                    onChange={() => togglePlacement(2, true)}
                    className="rounded text-cyan-400 bg-gray-900 border-theme-border w-3.5 h-3.5"
                  />
                  {t.rxAiOutput2}
                </label>
              </div>
            </div>

            {/* Markdown only */}
            <div className="flex items-center gap-2 pt-4">
              <input
                id="add-r-md"
                type="checkbox"
                checked={newForm.markdownOnly}
                onChange={(e) => setNewForm(prev => ({ ...prev, markdownOnly: e.target.checked }))}
                className="rounded text-cyan-400 bg-gray-900 border-theme-border w-4 h-4"
              />
              <div className="space-y-0.5">
                <label htmlFor="add-r-md" className="text-xs text-gray-300 font-semibold cursor-pointer">MarkdownOnly</label>
                <span className="block text-[9px] text-gray-500">{t.rxMdOnlyHint}</span>
              </div>
            </div>

            {/* Prompt only */}
            <div className="flex items-center gap-2 pt-4">
              <input
                id="add-r-prompt"
                type="checkbox"
                checked={newForm.promptOnly}
                onChange={(e) => setNewForm(prev => ({ ...prev, promptOnly: e.target.checked }))}
                className="rounded text-cyan-400 bg-gray-900 border-theme-border w-4 h-4"
              />
              <div className="space-y-0.5">
                <label htmlFor="add-r-prompt" className="text-xs text-gray-300 font-semibold cursor-pointer">PromptOnly</label>
                <span className="block text-[9px] text-gray-500">{t.rxPromptOnlyHint}</span>
              </div>
            </div>

            {/* Run on Edit */}
            <div className="flex items-center gap-2 pt-4">
              <input
                id="add-r-edit"
                type="checkbox"
                checked={newForm.runOnEdit}
                onChange={(e) => setNewForm(prev => ({ ...prev, runOnEdit: e.target.checked }))}
                className="rounded text-cyan-400 bg-gray-900 border-theme-border w-4 h-4"
              />
              <div className="space-y-0.5">
                <label htmlFor="add-r-edit" className="text-xs text-gray-300 font-semibold cursor-pointer">RunOnEdit</label>
                <span className="block text-[9px] text-gray-500">{t.rxRunOnEditHint}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="add-r-replace" className="block text-xs font-semibold text-gray-400">{t.rxReplace}</label>
            <textarea
              id="add-r-replace"
              rows={5}
              value={newForm.replaceString}
              onChange={(e) => setNewForm(prev => ({ ...prev, replaceString: e.target.value }))}
              placeholder={t.rxReplacePh}
              className="w-full bg-gray-900 border border-theme-border rounded-lg p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-cyan-400 resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-theme-border/50 pt-3">
            <button
              onClick={() => setIsAdding(false)}
              className="text-xs font-semibold text-gray-400 hover:text-gray-200 px-3 py-2 rounded-lg transition"
            >
              {t.rxCancelAdd}
            </button>
            <button
              onClick={handleAddRegex}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
            >
              {t.rxFinishAdd}
            </button>
          </div>
        </div>
      )}

      {/* Regex Cards List */}
      <div className="space-y-4">
        {regexes.length === 0 ? (
          <div className="bg-theme-panel border border-theme-border/50 rounded-xl p-8 text-center text-gray-500">
            <p className="text-xs italic">{t.rxEmpty}</p>
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs font-bold text-cyan-400 hover:underline mt-2 inline-block"
            >
              {t.rxEmptyCta}
            </button>
          </div>
        ) : (
          regexes.map((r) => {
            const isEditing = editingId === r.id;
            const isToggledOn = !r.disabled;

            return (
              <div
                key={r.id}
                className={`bg-theme-panel border rounded-xl overflow-hidden transition-all ${
                  isEditing 
                    ? 'border-cyan-500 shadow-md shadow-cyan-500/10' 
                    : isToggledOn 
                      ? 'border-theme-border hover:border-cyan-500/40' 
                      : 'border-theme-border/40 opacity-60'
                }`}
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-900/45 border-b border-theme-border/50 gap-3">
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.scriptName || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, scriptName: e.target.value }))}
                        className="bg-gray-900 border border-cyan-500/40 rounded px-2 py-0.5 text-xs text-cyan-400 font-bold focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-200 text-xs sm:text-sm">{r.scriptName}</span>
                        {!isToggledOn && (
                          <span className="bg-gray-800 text-gray-500 border border-theme-border font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                            {t.rxDisabled}
                          </span>
                        )}
                        {r.markdownOnly && (
                          <span className="bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                            {t.rxHtmlRender}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-500 mt-1 font-mono">
                      <span>ID: {r.id}</span>
                      <span>•</span>
                      <span className="text-cyan-400">Pattern: {isEditing ? t.rxSeeBelow : (
                        <span className="break-all">{r.findRegex}</span>
                      )}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Toggle button */}
                    <button
                      onClick={() => updateRegexScript(r.id, { disabled: !r.disabled })}
                      className={`p-1.5 rounded-lg border transition ${
                        isToggledOn 
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20' 
                          : 'bg-gray-900 border-theme-border text-gray-500 hover:text-gray-300'
                      }`}
                      title={isToggledOn ? t.rxToggleOff : t.rxToggleOn}
                    >
                      {isToggledOn ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    {/* Edit button */}
                    {isEditing ? (
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-1 bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition"
                      >
                        <Save size={12} />
                        {t.rxSave}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(r)}
                        className="p-1.5 rounded-lg border border-theme-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 transition"
                        title={t.rxEditTitle}
                      >
                        <Edit3 size={14} />
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => {
                        if (confirm(fmt(t.rxConfirmDelete, { name: r.scriptName }))) {
                          deleteRegexScript(r.id);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-theme-border text-gray-500 hover:text-red-400 hover:border-red-500/20 transition"
                      title={t.rxDeleteTitle}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Edit forms & replacements preview */}
                <div className="p-4 bg-gray-950/20">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-gray-900/60 p-2.5 rounded-lg border border-theme-border">
                        <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.placement?.includes(1)}
                            onChange={() => togglePlacement(1)}
                            className="rounded text-cyan-400 bg-gray-900 border-theme-border w-3.5 h-3.5"
                          />
                          {t.rxUserInputCap}
                        </label>
                        <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.placement?.includes(2)}
                            onChange={() => togglePlacement(2)}
                            className="rounded text-cyan-400 bg-gray-900 border-theme-border w-3.5 h-3.5"
                          />
                          {t.rxAiOutput2}
                        </label>
                        <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.markdownOnly}
                            onChange={(e) => setEditForm(prev => ({ ...prev, markdownOnly: e.target.checked }))}
                            className="rounded text-cyan-400 bg-gray-900 border-theme-border w-3.5 h-3.5"
                          />
                          MarkdownOnly
                        </label>
                        <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.promptOnly}
                            onChange={(e) => setEditForm(prev => ({ ...prev, promptOnly: e.target.checked }))}
                            className="rounded text-cyan-400 bg-gray-900 border-theme-border w-3.5 h-3.5"
                          />
                          PromptOnly
                        </label>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.rxEditPatternLabel}</label>
                        <textarea
                          rows={3}
                          value={editForm.findRegex || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, findRegex: e.target.value }))}
                          className="w-full bg-gray-900 border border-theme-border rounded-lg p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 resize-y"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.rxEditReplaceLabel}</label>
                        <textarea
                          rows={8}
                          value={editForm.replaceString || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, replaceString: e.target.value }))}
                          className="w-full bg-gray-900 border border-theme-border rounded-lg p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-cyan-400 resize-y"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.rxViewReplaceLabel}</span>
                      <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap line-clamp-5 bg-gray-900/20 border border-theme-border/30 rounded-lg p-3 overflow-y-auto max-h-40">
                        {r.replaceString || <span className="italic text-gray-600">{t.rxEmptyReplace}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
