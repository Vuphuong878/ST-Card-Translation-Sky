import { useSyncExternalStore, useEffect, useState } from 'react';
import { useStore } from '../store';
import { CallMonitor } from '../utils/callMonitor';
import { getRateLimitUsage, getUniqueKeyCount } from '../utils/apiClient';
import { Cpu, KeyRound, Activity, Gauge } from 'lucide-react';
import { useUi } from '../i18n/useLocale';
import { fmt } from '../i18n';

/** Live panel: which model is translating which entry, how many threads are
 *  running concurrently, and the combined RPM capacity across all API keys. */
export default function ActiveCallsPanel() {
  const { proxy, phase, fields, providers } = useStore();
  const ui = useUi();

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
  const accent = 'var(--accent-secondary)';

  // ─── Dựng lanes (provider + model) để hiện RPM tách theo từng provider ───
  const rlKey = (id: string, model: string) => (id === 'default' ? model : `${id}${model}`);
  type Lane = { providerId: string; providerName: string; model: string; limit: number; used: number; isSecondary: boolean };
  const lanes: Lane[] = [];
  const enabledProviders = providers.filter((p) => p.enabled && p.model?.trim());
  const showProviderName = enabledProviders.length > 0; // chỉ hiện tên provider khi có >1 provider
  const addLanes = (id: string, name: string, cfg: { model: string; primaryModelRpm: number; enableSecondaryModel: boolean; secondaryModel: string; secondaryModelRpm: number; apiKey: string; apiKeys: string[] }) => {
    const kc = getUniqueKeyCount(cfg);
    if (cfg.model) lanes.push({ providerId: id, providerName: name, model: cfg.model, isSecondary: false, limit: (cfg.primaryModelRpm > 0 ? cfg.primaryModelRpm : 5) * kc, used: usage[rlKey(id, cfg.model)] || 0 });
    if (cfg.enableSecondaryModel && cfg.secondaryModel?.trim()) lanes.push({ providerId: id, providerName: name, model: cfg.secondaryModel, isSecondary: true, limit: (cfg.secondaryModelRpm > 0 ? cfg.secondaryModelRpm : 17) * kc, used: usage[rlKey(id, cfg.secondaryModel)] || 0 });
  };
  addLanes('default', 'Provider #1', proxy);
  enabledProviders.forEach((p, i) => addLanes(p.id, p.name || `Provider #${i + 2}`, p));

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
          {fmt(ui.acRunning, { count: activeCalls.length })}
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
            <Activity size={11} /> {fmt(ui.acPeak, { count: CallMonitor.getPeakConcurrency() })}
          </span>
          <span>{fmt(ui.acCompleted, { count: CallMonitor.getCompleted() })}</span>
        </div>
      </div>

      {/* RPM theo từng provider + model (mỗi lane 1 thanh) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: activeCalls.length > 0 ? '10px' : '0' }}>
        {lanes.map((lane) => {
          const pct = lane.limit > 0 ? Math.min(100, (lane.used / lane.limit) * 100) : 0;
          return (
            <div key={lane.providerId + '|' + lane.model + '|' + (lane.isSecondary ? 's' : 'p')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', marginBottom: '3px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', minWidth: 0 }}>
                  <Cpu size={11} style={{ flexShrink: 0, color: lane.isSecondary ? '#fbbf24' : accent }} />
                  {showProviderName && <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0 4px', borderRadius: '3px', flexShrink: 0 }}>{lane.providerName}</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lane.model}</span>
                  {lane.isSecondary && <span style={{ fontSize: '0.55rem', color: '#fbbf24', flexShrink: 0 }}>{ui.acSecondary}</span>}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <Gauge size={10} /> {lane.used}/{lane.limit} RPM
                </span>
              </div>
              <div className="progress-track" style={{ height: '4px' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: pct > 85 ? 'var(--accent-danger)' : lane.isSecondary ? '#fbbf24' : 'linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))',
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
