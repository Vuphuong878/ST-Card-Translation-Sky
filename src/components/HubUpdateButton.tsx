import { useEffect, useRef, useState } from 'react';
import { Download, X, RefreshCw, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { APP_VERSION } from '../version';

interface Commit { hash: string; subject: string; }
type Phase = 'idle' | 'open' | 'updating' | 'done';
const DISMISS_KEY = 'update-autopopup-dismissed';

/**
 * Always-visible Hub update control. Lives right below the flow list so it shows in
 * EVERY flow (Dịch / Tạo Card / Tạo Preset / Mod Card / Trích Card). All tools are one git
 * repo, so a single "Cập nhật" (git pull) updates them all at once.
 *
 * - Checks on load; shows a green pulsing badge when the repo is behind origin.
 * - Auto-opens the modal once per session when updates are found.
 * - Click any time to re-check + update.
 */
export default function HubUpdateButton() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [behind, setBehind] = useState(0);
  const [checking, setChecking] = useState(false);
  const [log, setLog] = useState('');
  const [error, setError] = useState('');
  const checkedOnce = useRef(false);

  const check = async (opts?: { openIfFound?: boolean; openAlways?: boolean }) => {
    setChecking(true);
    try {
      const r = await fetch('/api/check-update');
      if (r.ok) {
        const data = await r.json();
        if (data?.ok) {
          setError('');
          setBehind(data.behind || 0);
          setCommits(Array.isArray(data.commits) ? data.commits : []);
          if (opts?.openAlways || (opts?.openIfFound && data.behind > 0)) setPhase('open');
          return data.behind || 0;
        }
        // ok:false → không kiểm tra được (không phải git clone / fetch lỗi / offline). BÁO RÕ.
        setError(String(data?.error || 'Không kiểm tra được cập nhật.'));
        setBehind(0); setCommits([]);
        if (opts?.openAlways) setPhase('open');
        return 0;
      }
    } catch {
      setError('Không gọi được API kiểm tra cập nhật (server dev chưa chạy?).');
      if (opts?.openAlways) setPhase('open');
    }
    finally { setChecking(false); }
    return 0;
  };

  useEffect(() => {
    if (checkedOnce.current) return;
    checkedOnce.current = true;
    const autoDismissed = (() => { try { return !!sessionStorage.getItem(DISMISS_KEY); } catch { return false; } })();
    check({ openIfFound: !autoDismissed });
  }, []);

  const runUpdate = async () => {
    setPhase('updating');
    setLog('');
    try {
      const res = await fetch('/api/update', { method: 'POST' });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setLog((p) => p + dec.decode(value, { stream: true }));
      }
      setPhase('done');
    } catch (e: any) {
      setLog((p) => p + `\nLỗi: ${e?.message || String(e)}`);
      setPhase('done');
    }
  };

  const closeModal = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setPhase('idle');
  };

  const hasUpdate = behind > 0;

  return (
    <>
      {/* ─── Rail button ─── */}
      <button
        onClick={() => check({ openAlways: true })}
        title={hasUpdate ? `Có ${behind} cập nhật mới — bấm để xem` : error ? `Không kiểm tra được: ${error}` : 'Kiểm tra cập nhật'}
        style={{
          position: 'relative',
          width: 64,
          padding: '9px 2px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          border: '1.5px solid ' + (hasUpdate ? '#39ff14' : '#00e5ff'),
          borderRadius: 10,
          background: hasUpdate ? 'rgba(57,255,20,0.15)' : 'rgba(0,229,255,0.10)',
          color: hasUpdate ? '#8dff6b' : '#5ff4ff',
          cursor: 'pointer',
          textShadow: hasUpdate ? '0 0 6px rgba(57,255,20,0.9)' : '0 0 6px rgba(0,229,255,0.8)',
          boxShadow: hasUpdate
            ? '0 0 12px rgba(57,255,20,0.75), inset 0 0 8px rgba(57,255,20,0.35)'
            : '0 0 10px rgba(0,229,255,0.55), inset 0 0 6px rgba(0,229,255,0.2)',
          transition: 'all 0.15s',
        }}
        className={hasUpdate ? 'hub-update-pulse' : 'hub-update-glow'}
      >
        {checking
          ? <RefreshCw size={20} className="spin" />
          : <Download size={20} />}
        <span style={{ fontSize: '0.62rem', fontWeight: 700, lineHeight: 1.15 }}>
          {hasUpdate ? 'Có bản mới' : 'Cập nhật'}
        </span>
        {hasUpdate && (
          <span style={{
            position: 'absolute', top: 2, right: 6, minWidth: 15, height: 15, padding: '0 3px',
            borderRadius: 8, background: '#22c55e', color: '#04120a', fontSize: '0.55rem',
            fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{behind}</span>
        )}
      </button>

      {/* ─── Modal ─── */}
      {phase !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002 }}>
          <div style={{ background: 'var(--bg-primary, #0f0f14)', width: '92%', maxWidth: 560, borderRadius: 12, border: '1px solid var(--accent-secondary, #4ecdc4)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle, #2a2a3e)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={18} style={{ color: 'var(--accent-secondary, #4ecdc4)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary, #f1f0f7)' }}>
                  {phase === 'updating' ? 'Đang cập nhật…' : phase === 'done' ? 'Cập nhật xong' : hasUpdate ? `Có ${behind} cập nhật mới` : error ? 'Không kiểm tra được cập nhật' : 'Đã là bản mới nhất'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #9b98ae)' }}>Bản hiện tại: v{APP_VERSION} · cập nhật 1 lần cho cả 5 tool</div>
              </div>
              {phase !== 'updating' && (
                <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}><X size={18} /></button>
              )}
            </div>
            <div style={{ padding: '16px 18px', maxHeight: 340, overflowY: 'auto' }}>
              {phase === 'open' && hasUpdate && (
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {commits.map((c) => (
                    <li key={c.hash} style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                      <code style={{ color: 'var(--accent-secondary)', fontSize: '0.7rem' }}>{c.hash}</code>{' '}
                      <span style={{ color: 'var(--text-primary, #f1f0f7)' }}>{c.subject}</span>
                    </li>
                  ))}
                </ul>
              )}
              {phase === 'open' && !hasUpdate && !error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary, #c8c5d8)', fontSize: '0.85rem' }}>
                  <Check size={16} style={{ color: '#22c55e' }} /> Không có commit mới. Bạn đang ở bản mới nhất.
                </div>
              )}
              {phase === 'open' && !hasUpdate && !!error && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#fbbf24' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{error}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted, #b6b2c9)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                    Cách xử lý: mở thư mục cài đặt, chạy <code style={{ color: 'var(--accent-secondary)' }}>git pull origin main</code> một lần rồi khởi động lại. Nếu chưa từng <code style={{ color: 'var(--accent-secondary)' }}>git clone</code> (tải ZIP) thì nút cập nhật không hoạt động được.
                  </div>
                </div>
              )}
              {(phase === 'updating' || phase === 'done') && (
                <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 6, fontSize: '0.75rem', fontFamily: 'monospace', minHeight: 120, maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{log || 'Đang chuẩn bị…'}</pre>
              )}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle, #2a2a3e)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {phase === 'open' && hasUpdate && (
                <>
                  <button onClick={closeModal} style={btnGhost}>Để sau</button>
                  <button onClick={runUpdate} style={btnPrimary}><Download size={14} /> Cập nhật ngay</button>
                </>
              )}
              {phase === 'open' && !hasUpdate && <button onClick={closeModal} style={btnPrimary}>Đóng</button>}
              {phase === 'done' && <button onClick={() => window.location.reload()} style={btnPrimary}><RefreshCw size={14} /> Tải lại trang</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const btnPrimary: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontWeight: 600, background: 'var(--accent-primary, #7c6af0)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem' };
const btnGhost: React.CSSProperties = { padding: '8px 16px', fontWeight: 600, background: 'transparent', color: 'var(--text-secondary, #c8c5d8)', border: '1px solid var(--border-subtle, #2a2a3e)', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem' };
