/**
 * LorebookRefinerPanel — Tab "AI Chỉnh Sửa" trong Lorebook
 * Phân tích, bổ sung, sửa, xóa entries bằng AI
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Wand2, Play, Pause, Square, ChevronDown, ChevronRight,
  Check, X, Eye, AlertTriangle, Info,
  Zap, ShieldAlert, CheckCircle2, ArrowDown, ArrowUp,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  runRefinerPipeline, applyRefinerActions,
  type RefinerContext, type ApplyContext,
} from '../../lib/ai/lorebookRefiner';
import type {
  RefinerConfig, RefinerAction, RefinerProgress, RefinerReport,
  RefinerOperationMode, RefinerActionType,
} from '../../types/lorebookRefiner.types';
import {
  DEFAULT_REFINER_CONFIG, REFINER_MODE_LABELS, REFINER_ACTION_LABELS,
} from '../../types/lorebookRefiner.types';
import { buildSchemaContextForBatch } from '../../lib/mvuzod/schemaContextBuilder';
import type { MVUZODSchema } from '../../types/mvuzod.types';

// ═══════════════════════════════════════════════════════════════════════════
// SEVERITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: ShieldAlert, label: 'Nghiêm trọng' },
  warning:  { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertTriangle, label: 'Cảnh báo' },
  suggestion: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Info, label: 'Đề xuất' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function LorebookRefinerPanel() {
  const addEntry = useCardStore(s => s.addEntry);
  const updateEntry = useCardStore(s => s.updateEntry);
  const deleteEntry = useCardStore(s => s.deleteEntry);
  const card = useCardStore(s => s.card);
  const createSnapshot = useCardStore(s => s.createSnapshot);
  const getNextEntryId = useCardStore(s => s.getNextEntryId);
  const settings = useSettingsStore();

  // ─── Config state ───────────────────────────────────────────────────
  const [config, setConfig] = useState<RefinerConfig>(DEFAULT_REFINER_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ─── Run state ──────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<RefinerProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [actions, setActions] = useState<RefinerAction[]>([]);
  const [report, setReport] = useState<RefinerReport | null>(null);
  const ctxRef = useRef<{ paused: boolean; stopped: boolean }>({ paused: false, stopped: false });
  const logEndRef = useRef<HTMLDivElement>(null);

  // ─── Preview state ──────────────────────────────────────────────────
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'severity' | 'type'>('severity');
  const [filterType, setFilterType] = useState<RefinerActionType | 'all'>('all');

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const activeProfile = useMemo(
    () => settings.profiles.find(p => p.id === settings.activeProfileId),
    [settings.profiles, settings.activeProfileId],
  );

  const entryCount = useMemo(
    () => card.data.character_book?.entries?.length ?? 0,
    [card.data.character_book?.entries],
  );

  // MVUZOD schema
  const mvuzodSchema = useMemo<MVUZODSchema | null>(() => {
    const ext = card.data.extensions as unknown as Record<string, unknown>;
    if (ext?.mvuzod) {
      return (ext.mvuzod as Record<string, unknown>).schema as MVUZODSchema ?? null;
    }
    return null;
  }, [card.data.extensions]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const updateConfig = useCallback(<K extends keyof RefinerConfig>(key: K, value: RefinerConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // ─── Sorted & filtered actions ──────────────────────────────────────

  const sortedActions = useMemo(() => {
    let filtered = filterType === 'all' ? actions : actions.filter(a => a.type === filterType);
    if (sortBy === 'severity') {
      const order = { critical: 0, warning: 1, suggestion: 2 };
      filtered = [...filtered].sort((a, b) => order[a.severity] - order[b.severity]);
    } else {
      filtered = [...filtered].sort((a, b) => a.type.localeCompare(b.type));
    }
    return filtered;
  }, [actions, sortBy, filterType]);

  const actionStats = useMemo(() => {
    const stats = { critical: 0, warning: 0, suggestion: 0, total: actions.length };
    for (const a of actions) {
      if (!a.skipped) stats[a.severity]++;
    }
    return stats;
  }, [actions]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (!activeProfile) {
      addLog('❌ Chưa cấu hình proxy profile. Vào Settings để tạo.');
      return;
    }
    if (entryCount === 0 && config.operationMode === 'fix_only') {
      addLog('❌ Không có entries nào để sửa. Chuyển sang chế độ "Chỉ bổ sung" hoặc "Toàn diện".');
      return;
    }

    setIsRunning(true);
    setProgress(null);
    setLogs([]);
    setActions([]);
    setReport(null);
    ctxRef.current = { paused: false, stopped: false };

    // Create snapshot before
    await createSnapshot('Before AI Refiner');
    addLog('💾 Đã tạo snapshot backup');

    try {
      const refinerCtx: RefinerContext = {
        card: structuredClone(useCardStore.getState().card),
        profile: activeProfile,
        generationParams: settings.generationParams,
        schemaContext: mvuzodSchema ? buildSchemaContextForBatch(mvuzodSchema) : undefined,
        get paused() { return ctxRef.current.paused; },
        get stopped() { return ctxRef.current.stopped; },
        log: addLog,
        onProgress: setProgress,
        onActionsReady: (allActions) => {
          setActions(allActions);
          if (config.autoApply) {
            // Auto-apply: immediately apply all non-skipped
            addLog('\n⚡ Auto-apply: đang áp dụng tất cả actions...');
            const applyCtx: ApplyContext = {
              getEntries: () => useCardStore.getState().card.data.character_book?.entries ?? [],
              addEntry: (entry) => { addEntry(entry); },
              updateEntry: (id, patch) => { updateEntry(id, patch); },
              deleteEntry: (id) => { deleteEntry(id); },
              getNextEntryId: () => getNextEntryId(),
              log: addLog,
            };
            const r = applyRefinerActions(allActions, applyCtx);
            setReport(r);
            setProgress({
              phase: 'done',
              currentBatch: 0,
              totalBatches: 0,
              actionsFound: allActions.length,
              actionsApplied: r.actionsApplied,
              message: `Hoàn thành: ${r.actionsApplied}/${allActions.length} actions đã áp dụng`,
            });
          }
        },
      };

      await runRefinerPipeline(config, refinerCtx);
    } catch (err) {
      addLog(`💥 Lỗi nghiêm trọng: ${err instanceof Error ? err.message : String(err)}`);
      setProgress(prev => prev ? { ...prev, phase: 'error', message: 'Lỗi nghiêm trọng' } : null);
    }

    setIsRunning(false);
  }, [activeProfile, config, entryCount, settings.generationParams, mvuzodSchema,
      addLog, createSnapshot, addEntry, updateEntry, deleteEntry, getNextEntryId]);

  const handlePause = useCallback(() => {
    const next = !ctxRef.current.paused;
    ctxRef.current.paused = next;
    setIsPaused(next);
    addLog(next ? '⏸ Tạm dừng...' : '▶️ Tiếp tục...');
  }, [addLog]);

  const handleStop = useCallback(() => {
    ctxRef.current.stopped = true;
    addLog('⏹ Dừng hẳn...');
  }, [addLog]);

  const handleApplyOne = useCallback((action: RefinerAction) => {
    const applyCtx: ApplyContext = {
      getEntries: () => useCardStore.getState().card.data.character_book?.entries ?? [],
      addEntry: (entry) => { addEntry(entry); },
      updateEntry: (id, patch) => { updateEntry(id, patch); },
      deleteEntry: (id) => { deleteEntry(id); },
      getNextEntryId: () => getNextEntryId(),
      log: addLog,
    };
    applyRefinerActions([action], applyCtx);
    setActions(prev => prev.map(a => a.id === action.id ? { ...a, applied: true } : a));
  }, [addEntry, updateEntry, deleteEntry, getNextEntryId, addLog]);

  const handleSkipOne = useCallback((actionId: string) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, skipped: true } : a));
  }, []);

  const handleApplyAll = useCallback(async () => {
    await createSnapshot('Before Apply All');
    addLog('💾 Đã tạo snapshot backup trước khi áp dụng tất cả');

    const toApply = actions.filter(a => !a.applied && !a.skipped);
    const applyCtx: ApplyContext = {
      getEntries: () => useCardStore.getState().card.data.character_book?.entries ?? [],
      addEntry: (entry) => { addEntry(entry); },
      updateEntry: (id, patch) => { updateEntry(id, patch); },
      deleteEntry: (id) => { deleteEntry(id); },
      getNextEntryId: () => getNextEntryId(),
      log: addLog,
    };
    const r = applyRefinerActions(toApply, applyCtx);
    setReport(r);
    setActions(prev => prev.map(a => toApply.includes(a) ? { ...a, applied: true } : a));
    setProgress(prev => prev ? {
      ...prev, phase: 'done',
      actionsApplied: r.actionsApplied,
      message: `Hoàn thành: ${r.actionsApplied} actions đã áp dụng`,
    } : null);
  }, [actions, createSnapshot, addEntry, updateEntry, deleteEntry, getNextEntryId, addLog]);

  const handleApplyBySeverity = useCallback(async (minSeverity: 'critical' | 'warning') => {
    await createSnapshot(`Before Apply ${minSeverity}+`);
    const severities = minSeverity === 'critical' ? ['critical'] : ['critical', 'warning'];
    const toApply = actions.filter(a => !a.applied && !a.skipped && severities.includes(a.severity));
    const applyCtx: ApplyContext = {
      getEntries: () => useCardStore.getState().card.data.character_book?.entries ?? [],
      addEntry: (entry) => { addEntry(entry); },
      updateEntry: (id, patch) => { updateEntry(id, patch); },
      deleteEntry: (id) => { deleteEntry(id); },
      getNextEntryId: () => getNextEntryId(),
      log: addLog,
    };
    const r = applyRefinerActions(toApply, applyCtx);
    setReport(prev => prev ? { ...prev, ...r } : r);
    setActions(prev => prev.map(a => toApply.includes(a) ? { ...a, applied: true } : a));
  }, [actions, createSnapshot, addEntry, updateEntry, deleteEntry, getNextEntryId, addLog]);

  // ─── Render ─────────────────────────────────────────────────────────

  const isPreview = progress?.phase === 'preview' && actions.length > 0;

  const pendingActions = actions.filter(a => !a.applied && !a.skipped);

  return (
    <div className="space-y-5 p-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <Wand2 className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">AI Lorebook Refiner</h2>
          <p className="text-xs text-muted-foreground">
            Phân tích, bổ sung, sửa, xóa — tối ưu toàn bộ lorebook bằng AI
          </p>
        </div>
        <div className="ml-auto px-3 py-1 rounded-lg bg-muted text-xs text-muted-foreground">
          {entryCount} entries
        </div>
      </div>

      {/* User Instruction */}
      <div className="space-y-2">
        <label className="settings-label">Yêu cầu / Hướng dẫn cho AI</label>
        <textarea
          value={config.userInstruction}
          onChange={e => updateConfig('userInstruction', e.target.value)}
          rows={3}
          className="settings-input text-sm resize-y"
          disabled={isRunning}
          placeholder="VD: Kiểm tra xem entries có mâu thuẫn gì không, bổ sung thêm NPC cho khu vực Hắc Long Đầm, sửa lại nội dung quá sơ sài..."
        />
      </div>

      {/* Operation Mode */}
      <div className="space-y-2">
        <label className="settings-label">Chế độ hoạt động</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(REFINER_MODE_LABELS) as [RefinerOperationMode, typeof REFINER_MODE_LABELS[RefinerOperationMode]][]).map(([mode, info]) => (
            <button
              key={mode}
              onClick={() => updateConfig('operationMode', mode)}
              disabled={isRunning}
              className={`px-3 py-2.5 rounded-lg text-sm border transition-colors text-left ${
                config.operationMode === mode
                  ? 'bg-violet-600/20 border-violet-500 text-violet-400'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <div className="font-medium">{info.icon} {info.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{info.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Config Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="settings-label">Max tokens / entry</label>
          <input
            type="number"
            value={config.maxTokensPerEntry}
            onChange={e => updateConfig('maxTokensPerEntry', Math.max(100, Math.min(10000, parseInt(e.target.value) || 500)))}
            className="settings-input" min={100} max={10000} step={50} disabled={isRunning}
          />
          <p className="text-[10px] text-muted-foreground mt-1">Content mỗi entry sẽ ít nhất {Math.round(config.maxTokensPerEntry * 0.6)} tokens</p>
        </div>
        <div>
          <label className="settings-label">Max entries xử lý (0 = tất cả)</label>
          <input
            type="number"
            value={config.maxEntriesToProcess}
            onChange={e => updateConfig('maxEntriesToProcess', Math.max(0, parseInt(e.target.value) || 0))}
            className="settings-input" min={0} disabled={isRunning}
          />
        </div>
        <div>
          <label className="settings-label">Entries / batch</label>
          <input
            type="number"
            value={config.entriesPerBatch}
            onChange={e => updateConfig('entriesPerBatch', Math.max(3, Math.min(20, parseInt(e.target.value) || 8)))}
            className="settings-input" min={3} max={20} disabled={isRunning}
          />
        </div>
        <div>
          <label className="settings-label">Batch song song</label>
          <input
            type="number"
            value={config.concurrentBatches}
            onChange={e => updateConfig('concurrentBatches', Math.max(1, Math.min(10, parseInt(e.target.value) || 2)))}
            className="settings-input" min={1} max={10} disabled={isRunning}
          />
        </div>
      </div>

      {/* Auto-apply toggle */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={config.autoApply}
            onChange={e => updateConfig('autoApply', e.target.checked)}
            className="settings-checkbox" disabled={isRunning}
          />
          <span className={`font-medium ${config.autoApply ? 'text-amber-400' : 'text-muted-foreground'}`}>
            ⚡ Tự động áp dụng (không preview)
          </span>
        </label>
        {!config.autoApply && (
          <p className="text-[10px] text-muted-foreground ml-6 mt-1">
            <Eye className="w-3 h-3 inline mr-1" />
            Chế độ Preview: Bạn sẽ xem từng đề xuất trước khi áp dụng
          </p>
        )}
      </div>

      {/* Fix Toggles */}
      <div className="space-y-2">
        <label className="settings-label">Tự động sửa lỗi</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'fixDuplicateUids' as const, label: '🆔 Sửa UID trùng', desc: 'Phát hiện & gán UID mới' },
            { key: 'fixKeywordIssues' as const, label: '🔑 Sửa Keywords', desc: 'Fullwidth comma, khoảng trắng thừa' },
            { key: 'fixConfigIssues' as const, label: '⚙️ Sửa Cấu hình', desc: 'Position, depth, recursion...' },
            { key: 'fixCoherenceIssues' as const, label: '🔗 Kiểm tra Logic', desc: 'Mâu thuẫn nội dung, tên, số liệu' },
            { key: 'fixSchemaConflicts' as const, label: '🧬 Sửa Schema', desc: 'Xung đột với MVUZOD schema' },
            { key: 'fixRegexConflicts' as const, label: '🧩 Sửa Regex', desc: 'Xung đột với regex scripts' },
          ]).map(item => (
            <label key={item.key} className="flex items-start gap-2 text-xs cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <input
                type="checkbox"
                checked={config[item.key]}
                onChange={e => updateConfig(item.key, e.target.checked)}
                className="settings-checkbox mt-0.5" disabled={isRunning}
              />
              <div>
                <span className="font-medium text-foreground">{item.label}</span>
                <p className="text-muted-foreground text-[10px]">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
          Tuỳ chọn nâng cao
          {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {showAdvanced && (
          <div className="px-4 pb-4 pt-3 border-t border-border">
            <label className="settings-label">Model Override (để trống = dùng profile mặc định)</label>
            <input
              type="text"
              value={config.modelOverride ?? ''}
              onChange={e => updateConfig('modelOverride', e.target.value || undefined)}
              className="settings-input text-xs font-mono" placeholder="gpt-4o-mini" disabled={isRunning}
            />
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="flex gap-2 flex-wrap">
        {!isRunning && !isPreview ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/50 font-medium text-sm hover:bg-violet-600/30 transition-colors"
          >
            <Wand2 className="w-4 h-4" /> Bắt đầu phân tích
          </button>
        ) : isRunning ? (
          <>
            <button onClick={handlePause}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
            </button>
            <button onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 transition-colors">
              <Square className="w-4 h-4" /> Dừng hẳn
            </button>
          </>
        ) : null}
      </div>

      {/* Progress bar */}
      {progress && progress.phase !== 'idle' && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {progress.phase === 'pre_analysis' && '🔍 Phân tích cục bộ...'}
              {progress.phase === 'ai_analysis' && `📡 AI Analysis — Batch ${progress.currentBatch}/${progress.totalBatches}`}
              {progress.phase === 'preview' && `👁️ Preview — ${pendingActions.length} actions chờ xem xét`}
              {progress.phase === 'applying' && '⚙️ Đang áp dụng...'}
              {progress.phase === 'done' && '✅ Hoàn thành'}
              {progress.phase === 'error' && '❌ Lỗi'}
              {progress.phase === 'stopped' && '⏹ Đã dừng'}
            </span>
            <span className="text-foreground font-medium">
              {progress.actionsFound} actions tìm thấy
            </span>
          </div>
          {progress.totalBatches > 0 && (
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-300"
                style={{ width: `${Math.round((progress.currentBatch / progress.totalBatches) * 100)}%` }}
              />
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">{progress.message}</p>
        </div>
      )}

      {/* ═══ ACTIONS PREVIEW ═══ */}
      {actions.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header with stats */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                Đề xuất ({actions.length})
              </span>
              {actionStats.critical > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-medium">
                  {actionStats.critical} nghiêm trọng
                </span>
              )}
              {actionStats.warning > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-medium">
                  {actionStats.warning} cảnh báo
                </span>
              )}
              {actionStats.suggestion > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-medium">
                  {actionStats.suggestion} đề xuất
                </span>
              )}
            </div>

            {/* Sort & Filter */}
            <div className="flex items-center gap-2 text-[10px]">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as 'severity' | 'type')}
                className="bg-muted rounded px-1.5 py-0.5 text-muted-foreground border-0">
                <option value="severity">Theo mức độ</option>
                <option value="type">Theo loại</option>
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value as RefinerActionType | 'all')}
                className="bg-muted rounded px-1.5 py-0.5 text-muted-foreground border-0">
                <option value="all">Tất cả</option>
                {Object.entries(REFINER_ACTION_LABELS).map(([type, info]) => (
                  <option key={type} value={type}>{info.icon} {info.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk action buttons */}
          {pendingActions.length > 0 && !config.autoApply && (
            <div className="px-4 py-2 border-b border-border bg-muted/10 flex gap-2 flex-wrap">
              <button onClick={handleApplyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/15 text-violet-400 text-xs font-medium hover:bg-violet-600/25 transition-colors">
                <Zap className="w-3.5 h-3.5" /> Áp dụng tất cả ({pendingActions.length})
              </button>
              {actionStats.critical > 0 && (
                <button onClick={() => handleApplyBySeverity('critical')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
                  <ShieldAlert className="w-3.5 h-3.5" /> Chỉ Critical ({actionStats.critical})
                </button>
              )}
              {(actionStats.critical > 0 || actionStats.warning > 0) && (
                <button onClick={() => handleApplyBySeverity('warning')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors">
                  <AlertTriangle className="w-3.5 h-3.5" /> Critical + Warning
                </button>
              )}
            </div>
          )}

          {/* Actions list */}
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {sortedActions.map(action => {
              const sev = SEVERITY_CONFIG[action.severity];
              const SevIcon = sev.icon;
              const typeInfo = REFINER_ACTION_LABELS[action.type];
              const isExpanded = expandedActionId === action.id;

              return (
                <div
                  key={action.id}
                  className={`border-b border-border last:border-b-0 transition-colors ${
                    action.applied ? 'bg-emerald-500/5 opacity-70' :
                    action.skipped ? 'bg-muted/30 opacity-50' : ''
                  }`}
                >
                  {/* Action header */}
                  <div className="flex items-start gap-2 px-4 py-2.5 cursor-pointer hover:bg-muted/20"
                    onClick={() => setExpandedActionId(isExpanded ? null : action.id)}>
                    <SevIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${sev.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded ${sev.bg} ${sev.color} text-[10px] font-medium`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                        <span className="font-medium text-foreground truncate">
                          {action.targetComment || action.newComment || '(mới)'}
                        </span>
                        {action.applied && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {action.skipped && <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{action.reason}</p>
                    </div>

                    {/* Action buttons */}
                    {!action.applied && !action.skipped && (
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleApplyOne(action)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          title="Áp dụng">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleSkipOne(action.id)}
                          className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                          title="Bỏ qua">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {isExpanded
                      ? <ArrowUp className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                      : <ArrowDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 space-y-2 border-t border-border/50 bg-muted/10">
                      {/* New content preview */}
                      {(action.newContent || action.mergedContent) && (
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {action.type === 'add_entry' ? 'Nội dung mới:' :
                             action.type === 'expand_content' ? (action.replaceOriginal ? 'Nội dung sửa + bổ sung (thay thế):' : 'Nội dung bổ sung (nối thêm):') :
                             action.type === 'merge_entries' ? 'Nội dung sau gộp:' : 'Nội dung sửa:'}
                          </span>
                          <pre className="mt-1 p-2 rounded-lg bg-background text-[11px] text-foreground/80 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin border border-border">
                            {action.newContent || action.mergedContent}
                          </pre>
                        </div>
                      )}

                      {/* New keys */}
                      {(action.newKeys || action.mergedKeys) && (
                        <div className="text-[10px]">
                          <span className="font-medium text-muted-foreground">Keywords: </span>
                          <span className="text-foreground font-mono">
                            {(action.newKeys || action.mergedKeys || []).join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Config patch */}
                      {action.configPatch && (
                        <div className="text-[10px]">
                          <span className="font-medium text-muted-foreground">Config: </span>
                          <code className="text-foreground bg-muted px-1 py-0.5 rounded">
                            {JSON.stringify(action.configPatch)}
                          </code>
                        </div>
                      )}

                      {/* Merge info */}
                      {action.type === 'merge_entries' && (
                        <div className="text-[10px] text-muted-foreground">
                          Gộp entry #{action.targetEntryId} "{action.targetComment}" → #{action.mergeTargetId} "{action.mergeTargetComment}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <h3 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Báo cáo
          </h3>
          <div className="grid grid-cols-4 gap-3 text-xs">
            {[
              { label: 'Đã áp dụng', value: report.actionsApplied, color: 'text-emerald-400' },
              { label: 'Bỏ qua', value: report.actionsSkipped, color: 'text-muted-foreground' },
              { label: 'Thêm mới', value: report.entriesAdded, color: 'text-blue-400' },
              { label: 'Đã sửa', value: report.entriesModified, color: 'text-amber-400' },
              { label: 'Đã xóa', value: report.entriesDeleted, color: 'text-red-400' },
              { label: 'Đã gộp', value: report.entriesMerged, color: 'text-violet-400' },
              { label: 'UID sửa', value: report.uidFixed, color: 'text-cyan-400' },
              { label: 'Thời gian', value: `${report.duration}ms`, color: 'text-muted-foreground' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs text-muted-foreground font-medium">
            Log ({logs.length})
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-thin px-4 py-2 space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className="text-xs font-mono text-muted-foreground leading-relaxed">{log}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
