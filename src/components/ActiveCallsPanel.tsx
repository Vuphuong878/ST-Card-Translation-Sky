import { useSyncExternalStore, useEffect, useState } from 'react';
import { useStore } from '../store';
import { CallMonitor } from '../utils/callMonitor';
import { getRateLimitUsage, getUniqueKeyCount } from '../utils/apiClient';
import { Cpu, KeyRound, Activity, Gauge } from 'lucide-react';

/** Live panel: which model is translating which entry, how many threads are
 *  running concurrently, and the combined RPM capacity across all API keys. */
export default function ActiveCallsPanel() {
  const { proxy, phase, fields } = useStore();

  const activeCalls = useSyncExternalStore(CallMonitor.subscribe, CallMonitor.getSnapshot);

  // % hoàn thành tổng — field xong / auto-skip / bỏ qua (ignored = user tick bỏ dịch) đều tính là đã xử lý.
  const total = fields.length;
  const accounted = fields.filter((f) => f.status === 'done' || f.status === 'skipped' || f.status === 'ignored').length;
  const overallPct = total > 0 ? Math.round((accounted / total) * 100) : 0;

  // RPM usage decays over time without events, so refresh on a light interval while active.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (phase !== 'translating') return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const isTranslating = phase === 'translating';
  if (!isTranslating && activeCalls.length === 0) return null;

  const keyCount = getUniqueKeyCount(proxy);
  const usage = getRateLimitUsage();

  const basePrimaryRpm = proxy.primaryModelRpm && proxy.primaryModelRpm > 0 ? proxy.primaryModelRpm : 5;
  const baseSecondaryRpm = proxy.secondaryModelRpm && proxy.secondaryModelRpm > 0 ? proxy.secondaryModelRpm : 17;

  const effectiveRpmFor = (model: string): number => {
    if (model === proxy.secondaryModel) return baseSecondaryRpm * keyCount;
    return basePrimaryRpm * keyCount; // primary or anything else falls back to primary rpm
  };

  // Build the list of models to show usage for: configured ones + any seen in usage.
  const modelsToShow = new Set<string>();
  if (proxy.model) modelsToShow.add(proxy.model);
  if (proxy.enableSecondaryModel && proxy.secondaryModel?.trim()) modelsToShow.add(proxy.secondaryModel);
  for (const m of Object.keys(usage)) modelsToShow.add(m);

  // Count active threads per model
  const perModelActive = new Map<string, number>();
  for (const c of activeCalls) perModelActive.set(c.model, (perModelActive.get(c.model) || 0) + 1);

  const accent = 'var(--accent-secondary)';

  return (
    <div
      style={{
        marginBottom: '12px',
        padding: '12px',
        background: 'rgba(56,189,248,0.05)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: accent }}>
          <Activity size={14} className={activeCalls.length > 0 ? 'spin' : ''} />
          Luồng đang chạy: {activeCalls.length}
          {total > 0 && (
            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(124,106,240,0.14)', padding: '1px 7px', borderRadius: '10px' }}>
              {overallPct}% ({accounted}/{total})
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.65rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <KeyRound size={11} /> {keyCount} API key{keyCount > 1 ? 's' : ''}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={11} /> Cao điểm: {CallMonitor.getPeakConcurrency()} luồng
          </span>
          <span>✓ {CallMonitor.getCompleted()} call xong</span>
        </div>
      </div>

      {/* Per-model RPM capacity (combined across keys) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: activeCalls.length > 0 ? '10px' : '0' }}>
        {[...modelsToShow].map((model) => {
          const used = usage[model] || 0;
          const limit = effectiveRpmFor(model);
          const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
          const activeHere = perModelActive.get(model) || 0;
          const isSecondary = model === proxy.secondaryModel;
          return (
            <div key={model}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', marginBottom: '3px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', minWidth: 0 }}>
                  <Cpu size={11} style={{ flexShrink: 0, color: isSecondary ? '#fbbf24' : accent }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{model}</span>
                  {isSecondary && <span style={{ fontSize: '0.55rem', color: '#fbbf24', flexShrink: 0 }}>(phụ)</span>}
                  {activeHere > 0 && (
                    <span style={{ fontSize: '0.55rem', color: accent, background: 'rgba(56,189,248,0.12)', padding: '0 4px', borderRadius: '3px', flexShrink: 0 }}>
                      {activeHere} đang chạy
                    </span>
                  )}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <Gauge size={10} /> {used}/{limit} RPM
                  {keyCount > 1 && (
                    <span style={{ fontSize: '0.55rem' }}>
                      ({isSecondary ? baseSecondaryRpm : basePrimaryRpm}×{keyCount} key)
                    </span>
                  )}
                </span>
              </div>
              <div className="progress-track" style={{ height: '4px' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: pct > 85 ? 'var(--accent-danger)' : isSecondary ? '#fbbf24' : 'linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))',
                    borderRadius: 'inherit',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active call list */}
      {activeCalls.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
          {activeCalls.map((c) => (
            <ActiveCallRow key={c.id} model={c.model} provider={c.provider} keyLabel={c.keyLabel} label={c.label} startedAt={c.startedAt} isSecondary={c.model === proxy.secondaryModel} />
          ))}
        </div>
      )}
    </div>
  );
}

const PROVIDER_LABEL: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Claude', google: 'Gemini', custom: 'Custom',
};

function ActiveCallRow({ model, provider, keyLabel, label, startedAt, isSecondary }: { model: string; provider?: string; keyLabel: string; label: string; startedAt: number; isSecondary: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const providerName = provider ? (PROVIDER_LABEL[provider] || provider) : '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 8px',
        background: 'rgba(0,0,0,0.18)',
        borderRadius: '4px',
        borderLeft: `2px solid ${isSecondary ? '#fbbf24' : 'var(--accent-secondary)'}`,
        fontSize: '0.66rem',
      }}
    >
      <span
        style={{
          fontWeight: 700,
          color: isSecondary ? '#fbbf24' : 'var(--accent-secondary)',
          background: isSecondary ? 'rgba(251,191,36,0.12)' : 'rgba(56,189,248,0.12)',
          padding: '1px 6px',
          borderRadius: '3px',
          flexShrink: 0,
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={`${providerName ? providerName + ' · ' : ''}${model}`}
      >
        {model}
      </span>
      {providerName && (
        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '3px', flexShrink: 0 }} title="Provider">
          {providerName}
        </span>
      )}
      <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
        {label}
      </span>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: '0.58rem' }}>{keyLabel}</span>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'monospace' }}>{elapsed}s</span>
    </div>
  );
}
