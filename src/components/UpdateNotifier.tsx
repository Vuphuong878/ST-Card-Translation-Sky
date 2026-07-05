import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Download, RefreshCw } from 'lucide-react';
import { APP_VERSION } from '../version';

interface Commit { hash: string; subject: string; }
type Phase = 'idle' | 'available' | 'updating' | 'done';

const DISMISS_KEY = 'update-dismissed-until'; // sessionStorage: hide for the rest of this session

/**
 * On load, ask the dev server whether the local repo is behind origin (git fetch + log).
 * If there are new commits, show a popup listing them (each commit subject already carries the
 * version + a short note, per our commit convention) and offer a one-click update.
 */
export default function UpdateNotifier() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [log, setLog] = useState('');
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    // Skip if the user already said "later" this session.
    try { if (sessionStorage.getItem(DISMISS_KEY)) return; } catch { /* ignore */ }

    (async () => {
      try {
        const r = await fetch('/api/check-update');
        if (!r.ok) return;
        const data = await r.json();
        if (data?.ok && data.behind > 0 && Array.isArray(data.commits) && data.commits.length > 0) {
          setCommits(data.commits);
          setPhase('available');
        }
      } catch { /* dev server not present / offline — stay silent */ }
    })();
  }, []);

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setPhase('idle');
  };

  const runUpdate = async () => {
    setPhase('updating');
    setLog('');
    try {
      const res = await fetch('/api/update', { method: 'POST' });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setLog((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setPhase('done');
    } catch (err: any) {
      setLog((prev) => prev + `\nLỗi: ${err?.message || String(err)}`);
      setPhase('done');
    }
  };

  if (phase === 'idle') return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001,
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary, #0f0f14)', width: '92%', maxWidth: 560,
          borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--accent-secondary, #4ecdc4)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle, #2a2a3e)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} style={{ color: 'var(--accent-secondary, #4ecdc4)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {phase === 'available' && `Có bản cập nhật mới (${commits.length} thay đổi)`}
              {phase === 'updating' && 'Đang cập nhật…'}
              {phase === 'done' && 'Cập nhật xong'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #9b98ae)' }}>
              Bản hiện tại: v{APP_VERSION}
            </div>
          </div>
          {phase !== 'updating' && (
            <button onClick={dismiss} title="Đóng" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px', maxHeight: 340, overflowY: 'auto' }}>
          {phase === 'available' && (
            <>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #c8c5d8)', marginBottom: 10 }}>
                Những thay đổi mới trên GitHub:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {commits.map((c) => (
                  <li key={c.hash} style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                    <code style={{ color: 'var(--accent-secondary)', fontSize: '0.7rem' }}>{c.hash}</code>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{c.subject}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {(phase === 'updating' || phase === 'done') && (
            <pre style={{
              background: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 6,
              fontSize: '0.75rem', fontFamily: 'monospace', minHeight: 120, maxHeight: 300,
              overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
            }}>
              {log || 'Đang chuẩn bị…'}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle, #2a2a3e)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {phase === 'available' && (
            <>
              <button onClick={dismiss} style={btnGhost}>Để sau</button>
              <button onClick={runUpdate} style={btnPrimary}>
                <Download size={14} /> Cập nhật ngay
              </button>
            </>
          )}
          {phase === 'done' && (
            <button onClick={() => window.location.reload()} style={btnPrimary}>
              <RefreshCw size={14} /> Tải lại trang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontWeight: 600,
  background: 'var(--accent-primary, #7c6af0)', color: 'white', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem',
};
const btnGhost: React.CSSProperties = {
  padding: '8px 16px', fontWeight: 600, background: 'transparent',
  color: 'var(--text-secondary, #c8c5d8)', border: '1px solid var(--border-subtle, #2a2a3e)',
  borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem',
};
