import { useSyncExternalStore, useEffect, useState } from 'react';
import { CallMonitor } from '../../lib/ai/callMonitor';
import { Activity, Cpu } from 'lucide-react';

/**
 * Floating live monitor of in-flight AI calls. Appears bottom-right whenever any AI
 * request is running (any flow: auto-creator, lorebook batch, MVUZOD, copilot, ...),
 * because callAI() is the single chokepoint. Shows thread count, peak, completed, and a
 * per-call row with model / key / elapsed — so you always know "đang chạy tới đâu".
 */
export default function AICallMonitor() {
  const calls = useSyncExternalStore(CallMonitor.subscribe, CallMonitor.getSnapshot);
  const [, tick] = useState(0);

  useEffect(() => {
    if (calls.length === 0) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [calls.length]);

  if (calls.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 9998, width: 300, maxWidth: '92vw',
        background: 'rgba(20,20,28,0.97)', border: '1px solid rgba(56,189,248,0.35)',
        borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: 12,
        color: '#e8e6f0', fontSize: 12, backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#38bdf8' }}>
          <Activity size={14} className="animate-spin" style={{ animationDuration: '2s' }} />
          {calls.length} luồng AI đang chạy
        </span>
        <span style={{ fontSize: 10, color: '#9b98ae' }}>
          cao điểm {CallMonitor.getPeakConcurrency()} · ✓ {CallMonitor.getCompleted()}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
        {calls.map((c) => {
          const elapsed = ((Date.now() - c.startedAt) / 1000).toFixed(1);
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
              background: 'rgba(0,0,0,0.25)', borderRadius: 6, borderLeft: '2px solid #38bdf8',
            }}>
              <Cpu size={11} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={`${c.model}${c.label ? ' · ' + c.label : ''}`}>
                {c.label || c.model}
              </span>
              <span style={{ fontSize: 10, color: '#9b98ae', flexShrink: 0 }}>{c.keyLabel}</span>
              <span style={{ fontSize: 10, color: '#9b98ae', fontFamily: 'monospace', flexShrink: 0 }}>{elapsed}s</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
