import { useState, useRef, useCallback, useEffect } from 'react';
import App from './App';
import { FLOWS, type FlowDef } from './flows';
import { RotateCw, ExternalLink } from 'lucide-react';
import HubUpdateButton from './components/HubUpdateButton';
import { APP_VERSION } from './version';

const RAIL_WIDTH = 78;
const LS_KEY = 'hub-active-flow';

/**
 * Top-level Hub shell. A slim left rail switches between "flows" (tools).
 *
 * Switching NEVER interrupts work:
 *  - The translate tool (native) is always mounted; it's just hidden (display:none) when
 *    another flow is active, so a running translation keeps going.
 *  - Each iframe tool is mounted on first visit and then kept mounted (hidden when inactive),
 *    so its in-progress state/generation is preserved when you switch away and back.
 */
export default function AppHub() {
  const [active, setActive] = useState<string>(() => {
    try { return localStorage.getItem(LS_KEY) || 'translate'; } catch { return 'translate'; }
  });
  // Iframe flows are lazily mounted on first activation, then kept alive.
  const [visited, setVisited] = useState<Set<string>>(() => new Set([active]));

  const select = useCallback((id: string) => {
    setActive(id);
    setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    try { localStorage.setItem(LS_KEY, id); } catch { /* ignore */ }
  }, []);

  const iframeFlows = FLOWS.filter((f) => f.kind === 'iframe');
  const activeFlow = FLOWS.find((f) => f.id === active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* ─── Header chung trên cả 5 app ─── */}
      <GlobalHeader activeFlow={activeFlow} />

      {/* ─── Rail + Content ─── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Flow rail */}
        <nav
          style={{
            width: RAIL_WIDTH,
            flexShrink: 0,
            background: 'var(--bg-secondary, #16161e)',
            borderRight: '1px solid var(--border-subtle, #2a2a3e)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 0',
            gap: '6px',
          }}
        >
          {FLOWS.map((f) => (
            <RailButton key={f.id} flow={f} active={active === f.id} onClick={() => select(f.id)} />
          ))}
          {/* Update button — ngay dưới các luồng (tự tụt xuống nếu thêm luồng thứ 5, 6...) */}
          <div style={{ height: 4 }} />
          <HubUpdateButton />
        </nav>

        {/* Content */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {/* Native translate tool — always mounted, hidden when inactive so it never stops */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'auto',
              display: active === 'translate' ? 'block' : 'none',
            }}
          >
            <App />
          </div>

          {/* Iframe tools — mounted on first visit, then kept alive */}
          {iframeFlows.map((f) =>
            visited.has(f.id) ? (
              <IframeFlow key={f.id} flow={f} active={active === f.id} />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

/** Header thương hiệu chung — nằm trên shell Hub nên hiển thị nhất quán trên cả 5 app. */
function GlobalHeader({ activeFlow }: { activeFlow?: FlowDef }) {
  return (
    <header
      style={{
        flexShrink: 0,
        height: 54,
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '0 18px',
        background: 'linear-gradient(90deg, var(--bg-secondary, #16161e) 0%, #191826 100%)',
        borderBottom: '1px solid var(--border-subtle, #2a2a3e)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 800, color: '#0f0f14',
          background: 'linear-gradient(135deg, #7c6af0, #4ecdc4)',
          boxShadow: '0 0 12px rgba(124,106,240,0.55)',
        }}
      >
        ST
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, minWidth: 0 }}>
          <span style={{ fontSize: '1.18rem', fontWeight: 800, letterSpacing: 0.3, whiteSpace: 'nowrap',
            background: 'linear-gradient(90deg, #a99cff, #4ecdc4)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Silly Tavern Multitools
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #b6b2c9)' }}>v{APP_VERSION}</span>
        </div>
        <span style={{ fontSize: '0.64rem', fontWeight: 500, letterSpacing: 0.2, whiteSpace: 'nowrap',
          color: 'var(--text-muted, #8b88a0)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ opacity: 0.7 }}>✦ Kết hợp của</span>
          <span style={{ fontWeight: 700, background: 'linear-gradient(90deg, #a99cff, #4ecdc4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Guillichan&nbsp;×&nbsp;Sky
          </span>
        </span>
      </div>
      {activeFlow && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
          fontSize: '0.86rem', color: activeFlow.color || 'var(--text-secondary, #d6d3e4)', fontWeight: 600 }}>
          <span style={{ fontSize: '1.2rem' }}>{activeFlow.emoji}</span>
          <span>{activeFlow.label}</span>
        </div>
      )}
    </header>
  );
}

function RailButton({ flow, active, onClick }: { flow: FlowDef; active: boolean; onClick: () => void }) {
  const color = flow.color || 'var(--accent-primary)';
  return (
    <button
      onClick={onClick}
      title={flow.label}
      style={{
        width: RAIL_WIDTH - 14,
        padding: '8px 2px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        border: '1px solid ' + (active ? color : 'transparent'),
        borderRadius: 10,
        background: active ? 'rgba(124,106,240,0.12)' : 'transparent',
        color: active ? color : 'var(--text-secondary, #a09cb5)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover, #2a2a3e)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{flow.emoji}</span>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.15 }}>{flow.label}</span>
    </button>
  );
}

function IframeFlow({ flow, active }: { flow: FlowDef; active: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [nonce, setNonce] = useState(0);
  const [ready, setReady] = useState(false);
  const url = flow.url || '';

  // The tool's dev server may still be booting when the Hub opens (start.bat launches both
  // at once). Poll the URL until it's reachable, THEN mount the iframe — so the user never
  // sees a permanent "refused to connect" and doesn't have to reload manually.
  useEffect(() => {
    if (ready || !url) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        if (!cancelled) setReady(true); // server answered → up
      } catch {
        if (!cancelled) timer = setTimeout(check, 1500); // connection refused → retry
      }
    };
    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [url, ready]);

  const reload = () => {
    // Re-probe + remount the iframe (also recovers if the tool server was restarted).
    setReady(false);
    setNonce((n) => n + 1);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: active ? 'flex' : 'none',
        flexDirection: 'column',
        background: 'var(--bg-primary, #0f0f14)',
      }}
    >
      {/* Slim toolbar — reload / open-in-tab + hint if the tool server isn't up */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 14px',
          borderBottom: '1px solid var(--border-subtle, #2a2a3e)',
          background: 'var(--bg-secondary, #16161e)',
          fontSize: '0.85rem',
          color: 'var(--text-muted, #b6b2c9)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: flow.color || 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1.15rem' }}>{flow.emoji}</span> {flow.label}
        </span>
        <span style={{ opacity: 0.85 }}>{ready ? 'Nếu trống → bấm Tải lại.' : 'Đang chờ server khởi động…'}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={reload} title="Tải lại" style={toolbarBtn}>
            <RotateCw size={16} /> Tải lại
          </button>
          <a href={url} target="_blank" rel="noreferrer" title="Mở tab mới" style={{ ...toolbarBtn, textDecoration: 'none' }}>
            <ExternalLink size={16} /> Tab mới
          </a>
        </div>
      </div>
      {ready ? (
        <iframe
          key={nonce}
          ref={ref}
          src={url}
          title={flow.label}
          style={{ flex: 1, width: '100%', border: 0, background: 'var(--bg-primary, #0f0f14)' }}
        />
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, color: 'var(--text-muted, #b6b2c9)', fontSize: '0.95rem',
        }}>
          <RotateCw size={24} className="spin" style={{ color: flow.color || 'var(--accent-primary)' }} />
          <div>Đang chờ server <b>{flow.label}</b> khởi động ({url.replace('http://', '')})…</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Lần đầu chạy start.bat có thể mất ~30s để cài đặt.</div>
        </div>
      )}
    </div>
  );
}

const toolbarBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  fontSize: '0.82rem',
  fontWeight: 600,
  border: '1px solid var(--border-subtle, #2a2a3e)',
  borderRadius: 7,
  background: 'var(--bg-elevated, #252536)',
  color: 'var(--text-secondary, #d6d3e4)',
  cursor: 'pointer',
};
