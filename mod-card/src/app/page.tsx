'use client';

import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import ModRulesManager, { ModRule } from '@/components/ModRulesManager';
import VarRemapPanel from '@/components/VarRemapPanel';
import { CardV3 } from '@/types/card';
import { LLMConfig } from '@/lib/llm';
import { usePersistedState } from '@/lib/usePersistedState';
import { CardParser } from '@/lib/parser';
import { ModOrchestrator, extractSections, applyModification, OrchestratorRule } from '@/lib/orchestrator';

interface AnalysisItem {
  section_id: string;
  label: string;
  status: string;
  reason: string;
  preview_change?: string;
}

interface AuditResult {
  consistency_score: number;
  summary: string;
  inconsistencies: { severity: string; dimension: string; description: string }[];
}

interface ValidationResult {
  status: 'PASS' | 'FAIL' | 'PASS_WITH_WARNINGS';
  stats?: { protected_fields_verified: number };
  issues?: { severity: string; category: string; description: string; fix: string }[];
}

export default function Home() {
  // Các state là "việc của user" → lưu localStorage để F5 / đóng tab không mất.
  const [card, setCard] = usePersistedState<CardV3 | null>('modcard.card', null);
  const [rules, setRules] = usePersistedState<ModRule[]>('modcard.rules', []);
  const [activeTab, setActiveTab] = usePersistedState<'upload' | 'workspace' | 'diff' | 'settings'>('modcard.activeTab', 'upload');

  const [llmConfig, setLlmConfig] = usePersistedState<LLMConfig>('modcard.llmConfig', {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-1.5-pro-latest',
    customUrl: ''
  });

  const [scannedModels, setScannedModels] = useState<string[]>([]);
  const [isScanningModels, setIsScanningModels] = useState(false);
  const [customPrompt, setCustomPrompt] = usePersistedState<string>('modcard.customPrompt', '');
  const [manualModelInput, setManualModelInput] = useState(false);

  const handleProviderChange = (provider: 'openai' | 'anthropic' | 'gemini') => {
    let defaultModel = 'gemini-1.5-pro-latest';
    if (provider === 'openai') {
      defaultModel = 'gpt-4o';
    } else if (provider === 'anthropic') {
      defaultModel = 'claude-3-5-sonnet-20240620';
    }
    
    setLlmConfig(prev => ({
      ...prev,
      provider,
      model: defaultModel,
      customUrl: ''
    }));
    setScannedModels([]);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  // Kết quả cũng lưu lại để xem lại sau khi F5.
  const [analysisResult, setAnalysisResult] = usePersistedState<AnalysisItem[] | null>('modcard.analysisResult', null);
  const [moddedCard, setModdedCard] = usePersistedState<CardV3 | null>('modcard.moddedCard', null);
  const [auditResult, setAuditResult] = usePersistedState<AuditResult | null>('modcard.auditResult', null);
  const [validationResult, setValidationResult] = usePersistedState<ValidationResult | null>('modcard.validationResult', null);
  const [isMvuCard, setIsMvuCard] = usePersistedState<boolean>('modcard.isMvuCard', false);
  const [mvuVariables, setMvuVariables] = usePersistedState<string[]>('modcard.mvuVariables', []);

  const handleCardLoaded = (loadedCard: CardV3) => {
    setCard(loadedCard);
    const mvu = CardParser.detectMvuZod(loadedCard);
    setIsMvuCard(mvu);
    if (mvu) {
      setMvuVariables(CardParser.extractVariables(loadedCard));
    } else {
      setMvuVariables([]);
    }
    setActiveTab('workspace');
  };

  const handleScanModels = async () => {
    if (!llmConfig.apiKey) {
      alert('Vui lòng nhập API Key trước khi quét.');
      return;
    }
    setIsScanningModels(true);
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: llmConfig.provider,
          apiKey: llmConfig.apiKey,
          customUrl: llmConfig.customUrl
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Quét model thất bại');
      }
      const data = await res.json();
      setScannedModels(data.models || []);
      if (data.models && data.models.length > 0) {
        setLlmConfig(prev => ({ ...prev, model: data.models[0] }));
      }
      alert(`Đã quét thành công ${data.models?.length || 0} models!`);
    } catch (err: unknown) {
      console.error(err);
      alert('Lỗi quét model: ' + (err as Error).message);
    } finally {
      setIsScanningModels(false);
    }
  };

  const runFullPipeline = async () => {
    if (!card || !llmConfig.apiKey) {
      alert('Vui lòng tải thẻ và nhập API Key trong phần Cài đặt trước khi chạy.');
      return;
    }

    setIsProcessing(true);
    setProcessStatus('Giai đoạn 1: Đang khởi tạo và chuẩn bị...');
    setAnalysisResult(null);
    setModdedCard(null);
    setAuditResult(null);
    setValidationResult(null);

    // Artificial delay to let user see initialization phase
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Merge Mod Rules and User Custom Prompt
    const activeRules: OrchestratorRule[] = rules.map(r => ({
      id: r.id,
      name: r.name,
      details: r.details,
      keywords: r.keywords,
      enabled: r.enabled
    }));
    
    if (customPrompt.trim()) {
      activeRules.push({
        id: 'USER_CUSTOM_PROMPT',
        name: 'Yêu cầu tùy chỉnh của người dùng',
        keywords: '',
        details: customPrompt,
        enabled: true
      });
    }

    if (activeRules.length === 0) {
      alert('Vui lòng thêm ít nhất 1 Rule hoặc nhập Yêu cầu tùy chỉnh.');
      setIsProcessing(false);
      return;
    }

    try {
      const orchestrator = new ModOrchestrator(llmConfig);
      
      // Step 2: Analyze
      setProcessStatus('Giai đoạn 2: Đang gọi LLM phân tích thẻ (Analyze Phase)...');
      const analysis = await orchestrator.analyze(card, activeRules);
      setAnalysisResult(analysis);

      // Step 3: Mod
      setProcessStatus('Giai đoạn 3: Đang tiến hành Mod các section được đánh dấu (NEEDS_MOD)...');
      const sectionsToMod = analysis.filter((s: AnalysisItem) => s.status === 'NEEDS_MOD');
      const allSections = extractSections(card);
      
      let currentContext = '';
      let currentCard = JSON.parse(JSON.stringify(card));
      const moddedEntries: { index: number; content: string }[] = [];
      
      for (const req of sectionsToMod) {
        setProcessStatus(`Giai đoạn 3: Đang mod section ${String(req.label)}...`);
        const sectionData = allSections.find(s => s.section_id === req.section_id);
        if (sectionData) {
          const modded = await orchestrator.modSection(currentCard, sectionData, activeRules, currentContext);
          currentCard = applyModification(currentCard, sectionData.field_path, modded);
          currentContext += `\n[Đã sửa ${String(req.label)}]:\n${modded}\n`;
          
          if (sectionData.section_id.startsWith('entry_')) {
            moddedEntries.push({
              index: parseInt(sectionData.section_id.replace('entry_', '')),
              content: modded
            });
          }
        }
      }
      
      // Step 4: Keyword Sync
      if (moddedEntries.length > 0) {
        setProcessStatus('Giai đoạn 4: Đang đồng bộ hóa từ khóa (Keyword Sync)...');
        const syncResults = await orchestrator.syncKeywords(currentCard, activeRules, moddedEntries);
        syncResults.forEach((sync: { action: string; entry_index: number; formatted_key_string?: string }) => {
          if (sync.action === 'UPDATE' && sync.formatted_key_string) {
            const path = `data.character_book.entries[${sync.entry_index}].keys`;
            const keysArray = sync.formatted_key_string.split(',').map((k: string) => k.trim());
            currentCard = applyModification(currentCard, path, keysArray as unknown as string);
          }
        });
      }

      // Step 5: Consistency Audit
      setProcessStatus('Giai đoạn 4: Đang đánh giá độ nhất quán (Consistency Audit)...');
      const audit = await orchestrator.auditConsistency(currentCard, activeRules);
      setAuditResult(audit);

      // Step 6: Validation
      setProcessStatus('Giai đoạn 5: Đang chạy kiểm định tính an toàn cấu trúc (Validation)...');
      const validation = await orchestrator.validateCard(card, currentCard, activeRules);
      setValidationResult(validation);
      
      setModdedCard(currentCard);
      setProcessStatus('Hoàn tất toàn bộ quy trình Mod! Đã có kết quả ở Bảng Diff.');
      setActiveTab('diff');
    } catch (error: unknown) {
      console.error(error);
      alert('Gặp lỗi trong quá trình xử lý: ' + (error as Error).message);
      setProcessStatus('Lỗi quy trình.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!moddedCard) return;
    const blob = new Blob([JSON.stringify(moddedCard, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MODDED_${moddedCard.data?.name || 'card'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="max-w-6xl mx-auto mb-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-950 tracking-tight">
              SillyTavern Card Mod AI IDE
            </h1>
            <p className="text-gray-700 mt-1 font-medium">Chỉnh sửa tự động Character Card V3 an toàn với LLM</p>
          </div>
          <button 
            onClick={() => setActiveTab('settings')}
            className="text-sm font-bold text-gray-800 hover:text-indigo-700 flex items-center gap-1"
          >
            ⚙️ Cài đặt LLM
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cột trái: Quản lý File & Rules */}
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-extrabold text-gray-950 mb-3">Tệp Nhân Vật</h2>
            {!card ? (
              <FileUploader onCardLoaded={handleCardLoaded} />
            ) : (
              <div className="p-3 bg-green-50 border border-green-300 rounded text-sm">
                <p className="font-bold text-green-950">✅ Đã tải: {card.data?.name || 'Vô danh'}</p>
                {isMvuCard && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-950 border border-purple-300 rounded text-xs font-black animate-pulse">
                    🧬 Kiến trúc RPG: MVU-ZOD Card
                  </span>
                )}
                <p className="text-green-900 text-xs mt-1 font-semibold truncate">
                  {card.data?.description?.substring(0, 80)}...
                </p>
                <button 
                  onClick={() => { setCard(null); setAnalysisResult(null); setIsMvuCard(false); setMvuVariables([]); setActiveTab('upload'); }}
                  className="mt-3 text-xs text-red-600 hover:underline"
                >
                  Tải thẻ khác
                </button>
              </div>
            )}
          </div>

          {isMvuCard && mvuVariables.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-extrabold text-gray-950 mb-1">Cơ sở dữ liệu Biến số (Zod)</h2>
              <p className="text-xs text-gray-700 font-semibold mb-2">
                Các biến được định nghĩa cứng trong Zod Schema:
              </p>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50 flex flex-wrap gap-1">
                {mvuVariables.map((v, i) => (
                  <span key={i} className="text-xs px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold rounded">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isMvuCard && card && (
            <VarRemapPanel
              card={card}
              llmConfig={llmConfig}
              onApplied={(newCard, count) => {
                setModdedCard(newCard);
                setProcessStatus(`Đã đổi ${count} biến MVU-Zod. Xem tab So sánh / Xuất file.`);
                setActiveTab('diff');
              }}
            />
          )}

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-extrabold text-gray-950 mb-3">Yêu cầu Mod bằng AI</h2>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Nhập yêu cầu tùy chỉnh... VD: Đổi tên nhân vật từ Ngân Kỳ sang Anh Kiệt, và đổi cốt truyện thành một hiệp sĩ trung cổ..."
              rows={4}
              className="w-full text-sm rounded-md border-gray-400 shadow-sm border-2 p-2 bg-gray-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-800 text-gray-950 font-medium"
            />
          </div>

          <ModRulesManager rules={rules} onChange={setRules} />

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-extrabold text-gray-950 mb-2">Điều khiển Orchestrator</h3>
            <button
              onClick={runFullPipeline}
              disabled={!card || isProcessing || (rules.filter(r => r.enabled).length === 0 && !customPrompt.trim())}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🚀 Chạy Mod Card Tự Động
            </button>

            {isProcessing && (
              <div className="mt-3 p-2 bg-blue-50 text-blue-800 text-xs rounded border border-blue-200 animate-pulse">
                ⏳ {processStatus}
              </div>
            )}
            {!isProcessing && processStatus && (
              <div className="mt-3 p-2 bg-gray-100 text-gray-700 text-xs rounded border border-gray-200">
                ℹ️ {processStatus}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Workspace & Diff Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="border-b px-4 py-3 flex gap-4 text-sm font-medium">
              <button 
                onClick={() => setActiveTab('workspace')}
                className={`pb-1 border-b-2 ${activeTab === 'workspace' ? 'border-indigo-600 text-indigo-700 font-bold' : 'border-transparent text-gray-700 hover:text-gray-950 font-semibold'}`}
              >
                Workspace (Sections)
              </button>
              <button 
                onClick={() => setActiveTab('diff')}
                className={`pb-1 border-b-2 ${activeTab === 'diff' ? 'border-indigo-600 text-indigo-700 font-bold' : 'border-transparent text-gray-700 hover:text-gray-950 font-semibold'}`}
              >
                Bảng Diff (Kết quả)
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`pb-1 border-b-2 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-700 font-bold' : 'border-transparent text-gray-700 hover:text-gray-950 font-semibold'}`}
              >
                Cài đặt
              </button>
            </div>
            
            <div className="p-4 flex-1 bg-gray-50 overflow-auto min-h-[500px]">
              {activeTab === 'upload' && !card && (
                <div className="h-full flex items-center justify-center text-gray-700 font-semibold">
                  Hãy tải một thẻ JSON ở cột bên trái để bắt đầu.
                </div>
              )}
              
              {activeTab === 'workspace' && (
                <div>
                  <h3 className="font-bold text-gray-950 text-lg mb-3">Kết quả Phân tích (Analysis Report)</h3>
                  {!analysisResult ? (
                    <div className="text-gray-700 font-medium text-sm">Chưa có kết quả phân tích. Hãy nhấn &quot;Bắt đầu Phân Tích&quot;.</div>
                  ) : (
                    <div className="space-y-3">
                      {analysisResult.map((res: AnalysisItem, idx: number) => (
                        <div key={idx} className={`p-3 rounded border ${res.status === 'NEEDS_MOD' ? 'bg-orange-50 border-orange-300' : 'bg-gray-100 border-gray-300'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-950">{String(res.label || res.section_id)}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-black ${res.status === 'NEEDS_MOD' ? 'bg-orange-200 text-orange-950' : 'bg-gray-300 text-gray-900'}`}>
                              {String(res.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 mb-1"><strong>Lý do:</strong> {String(res.reason)}</p>
                          {res.status === 'NEEDS_MOD' && (
                            <p className="text-sm text-gray-900"><strong>Dự kiến sửa:</strong> {String(res.preview_change)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'diff' && (
                <div className="h-full">
                  <h3 className="font-bold text-gray-950 text-lg mb-3">Kết Quả (Diff Viewer & Audit)</h3>
                  {!moddedCard ? (
                    <div className="flex items-center justify-center text-gray-700 font-semibold h-64">
                      Hãy chạy &quot;Mod Card Tự Động&quot; để xem kết quả tại đây.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {auditResult && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-4 rounded-lg border ${auditResult.consistency_score >= 80 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-gray-950">1. Nhất Quán (Audit Score)</h4>
                              <span className="text-xl font-black text-gray-950">{auditResult.consistency_score}/100</span>
                            </div>
                            <p className="text-sm mt-1 text-gray-900 font-medium">{auditResult.summary}</p>
                            {auditResult.inconsistencies?.length > 0 && (
                              <ul className="mt-3 text-xs space-y-1">
                                {auditResult.inconsistencies.map((inc: { severity: string; dimension: string; description: string }, i: number) => (
                                  <li key={i} className="text-red-950 bg-red-100 p-2 rounded border border-red-200 font-medium">
                                    <strong>[{inc.severity}] {inc.dimension}:</strong> {inc.description}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {validationResult && (
                            <div className={`p-4 rounded-lg border ${validationResult.status === 'PASS' ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}`}>
                              <div className="flex items-center justify-between">
                                <h4 className="font-black text-gray-950">2. Kiểm Định (Validation Status)</h4>
                                <span className={`text-sm px-2 py-0.5 rounded font-black ${validationResult.status === 'PASS' ? 'bg-green-200 text-green-950' : 'bg-orange-200 text-orange-950'}`}>
                                  {validationResult.status}
                                </span>
                              </div>
                              <p className="text-xs mt-1 text-gray-900 font-semibold">
                                Đã xác thực: {validationResult.stats?.protected_fields_verified || 0} trường bảo vệ.
                              </p>
                              {validationResult.issues && validationResult.issues.length > 0 && (
                                <ul className="mt-3 text-xs space-y-1">
                                  {validationResult.issues.map((issue: { severity: string; category: string; description: string; fix: string }, i: number) => (
                                    <li key={i} className="text-orange-950 bg-orange-100 p-2 rounded border border-orange-200 font-medium">
                                      <strong>[{issue.severity}] {issue.category}:</strong> {issue.description} (Đề xuất: {issue.fix})
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-4 mb-4">
                        <button
                          onClick={handleDownload}
                          className="px-4 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 shadow"
                        >
                          ⬇️ Tải xuống JSON (Đã ghép Avatar)
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="border rounded-md overflow-hidden flex flex-col">
                          <div className="bg-red-100 p-2 font-semibold text-red-800 border-b border-red-200 text-sm">JSON Gốc (Chỉ hiển thị Text fields)</div>
                          <pre className="p-3 bg-white text-xs overflow-auto flex-1 max-h-[500px]">
                            {JSON.stringify({
                              description: card?.data?.description,
                              personality: card?.data?.personality,
                              scenario: card?.data?.scenario,
                              first_mes: card?.data?.first_mes,
                            }, null, 2)}
                          </pre>
                        </div>
                        <div className="border rounded-md overflow-hidden flex flex-col">
                          <div className="bg-green-100 p-2 font-semibold text-green-800 border-b border-green-200 text-sm">JSON Sau Mod (Đã áp dụng thay đổi)</div>
                          <pre className="p-3 bg-white text-xs overflow-auto flex-1 max-h-[500px]">
                            {JSON.stringify({
                              description: moddedCard?.data?.description,
                              personality: moddedCard?.data?.personality,
                              scenario: moddedCard?.data?.scenario,
                              first_mes: moddedCard?.data?.first_mes,
                            }, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-xl bg-gray-50 p-6 rounded-xl border-2 border-gray-300 shadow-inner">
                  <h3 className="font-black text-2xl text-gray-950 mb-6 border-b-2 border-gray-300 pb-2">⚙️ Cài Đặt Cấu Hình LLM & Proxy</h3>
                  <div className="space-y-5">
                    {/* Provider */}
                    <div>
                      <label className="block text-sm font-black text-gray-950">1. Nhà Cung Cấp (Provider)</label>
                      <select 
                        value={llmConfig.provider} 
                        onChange={e => handleProviderChange(e.target.value as 'gemini' | 'anthropic' | 'openai')}
                        className="mt-1 block w-full rounded-md border-2 border-gray-400 shadow-sm p-2 text-gray-950 font-bold bg-white focus:border-indigo-600"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="anthropic">Anthropic Claude</option>
                        <option value="openai">OpenAI / OpenRouter / Custom Proxy</option>
                      </select>
                    </div>

                    {/* Custom Proxy URL (Link Proxy) */}
                    <div>
                      <label className="block text-sm font-black text-gray-950">2. Đường Dẫn Proxy (Proxy Base URL)</label>
                      <input 
                        type="text" 
                        value={llmConfig.customUrl || ''} 
                        onChange={e => setLlmConfig({...llmConfig, customUrl: e.target.value})}
                        placeholder={
                          llmConfig.provider === 'openai' ? "VD: https://api.openrouter.ai/v1 hoặc https://api.openai.com/v1" :
                          llmConfig.provider === 'gemini' ? "Mặc định (Google API) hoặc URL Proxy của bạn" :
                          "Mặc định (Anthropic API) hoặc URL Proxy của bạn"
                        }
                        className="mt-1 block w-full rounded-md border-2 border-gray-400 shadow-sm p-2 text-gray-950 font-bold bg-white placeholder-gray-600 focus:border-indigo-600"
                      />
                      <p className="text-xs text-gray-800 font-semibold mt-1">Để trống nếu muốn sử dụng API mặc định trực tiếp của nhà cung cấp.</p>
                    </div>

                    {/* API Key / Password (Mật khẩu Proxy) */}
                    <div>
                      <label className="block text-sm font-black text-gray-950">3. API Key / Mật Khẩu Proxy (Proxy Password)</label>
                      <input 
                        type="password" 
                        value={llmConfig.apiKey} 
                        onChange={e => setLlmConfig({...llmConfig, apiKey: e.target.value})}
                        placeholder="Nhập API Key hoặc Mật khẩu Proxy của bạn"
                        className="mt-1 block w-full rounded-md border-2 border-gray-400 shadow-sm p-2 text-gray-950 font-bold bg-white placeholder-gray-600 focus:border-indigo-600"
                      />
                      <p className="text-xs text-gray-900 font-bold mt-1">
                        🔒 Bảo mật: Thông tin chỉ lưu cục bộ trong trình duyệt của bạn (Local Storage) và không bao giờ tải lên bất kỳ máy chủ bên thứ ba nào ngoại trừ proxy bạn đã chọn.
                      </p>
                    </div>

                    {/* Scan button */}
                    <button
                      type="button"
                      onClick={handleScanModels}
                      disabled={isScanningModels || !llmConfig.apiKey}
                      className="w-full py-2.5 bg-indigo-700 text-white rounded-lg font-black hover:bg-indigo-800 disabled:opacity-50 transition-colors shadow-md text-sm cursor-pointer"
                    >
                      {isScanningModels ? '🔄 Đang Quét Models...' : '🔍 Quét Danh Sách Model Từ Proxy'}
                    </button>

                    {/* Model */}
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-black text-gray-950">4. Chọn Model Cần Dùng</label>
                        <button
                          type="button"
                          onClick={() => setManualModelInput(!manualModelInput)}
                          className="text-xs text-indigo-700 hover:text-indigo-900 font-black underline"
                        >
                          {manualModelInput ? "Chọn từ danh sách" : "Nhập tay tên model"}
                        </button>
                      </div>

                      {manualModelInput ? (
                        <input 
                          type="text" 
                          value={llmConfig.model} 
                          onChange={e => setLlmConfig({...llmConfig, model: e.target.value})}
                          placeholder="Nhập chính xác tên model, VD: gpt-4o, gemini-1.5-pro-latest"
                          className="mt-1 block w-full rounded-md border-2 border-gray-400 shadow-sm p-2 text-gray-950 font-bold bg-white placeholder-gray-600 focus:border-indigo-600"
                        />
                      ) : (
                        <select
                          value={llmConfig.model}
                          onChange={e => setLlmConfig({...llmConfig, model: e.target.value})}
                          className="mt-1 block w-full rounded-md border-2 border-gray-400 shadow-sm p-2 text-gray-950 font-bold bg-white focus:border-indigo-600 font-extrabold"
                        >
                          {scannedModels.length > 0 ? (
                            scannedModels.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))
                          ) : (
                            // Mẫu mặc định tùy theo Provider
                            llmConfig.provider === 'gemini' ? (
                              <>
                                <option value="gemini-1.5-pro-latest">gemini-1.5-pro-latest (Khuyên dùng)</option>
                                <option value="gemini-1.5-flash-latest">gemini-1.5-flash-latest (Nhanh)</option>
                                <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
                              </>
                            ) : llmConfig.provider === 'openai' ? (
                              <>
                                <option value="gpt-4o">gpt-4o (Khuyên dùng)</option>
                                <option value="gpt-4o-mini">gpt-4o-mini</option>
                                <option value="gpt-4-turbo">gpt-4-turbo</option>
                              </>
                            ) : (
                              <>
                                <option value="claude-3-5-sonnet-20240620">claude-3-5-sonnet-20240620 (Khuyên dùng)</option>
                                <option value="claude-3-opus-20240229">claude-3-opus-20240229</option>
                                <option value="claude-3-haiku-20240307">claude-3-haiku-20240307</option>
                              </>
                            )
                          )}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t-2 border-gray-300 pt-4">
                      {/* Max Output Tokens */}
                      <div>
                        <label className="block text-xs font-black text-gray-950">5. Output Tokens Tối Đa (Max Output)</label>
                        <input 
                          type="number" 
                          min={256}
                          max={16384}
                          value={llmConfig.maxOutputTokens || 4096}
                          onChange={e => setLlmConfig({...llmConfig, maxOutputTokens: parseInt(e.target.value) || 4096})}
                          className="mt-1 block w-full rounded-md border-2 border-gray-400 shadow-sm p-2 text-gray-950 font-bold bg-white focus:border-indigo-600"
                        />
                      </div>

                      {/* Temperature */}
                      <div>
                        <label className="block text-xs font-black text-gray-950">6. Độ Sáng Tạo (Temperature)</label>
                        <input 
                          type="number" 
                          min={0.0}
                          max={2.0}
                          step={0.1}
                          value={llmConfig.temperature !== undefined ? llmConfig.temperature : 0.2}
                          onChange={e => setLlmConfig({...llmConfig, temperature: parseFloat(e.target.value) || 0.2})}
                          className="mt-1 block w-full rounded-md border-2 border-gray-400 shadow-sm p-2 text-gray-950 font-bold bg-white focus:border-indigo-600"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </main>
    </div>
  );
}
