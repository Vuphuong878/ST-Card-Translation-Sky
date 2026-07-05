import { useState, useRef, useCallback, useEffect } from 'react';
import App from './App';
import { FLOWS, type FlowDef } from './flows';
import { RotateCw, ExternalLink } from 'lucide-react';
import HubUpdateButton from './components/HubUpdateButton';

const RAIL_WIDTH = 66;
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

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* ─── Flow rail ─── */}
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
        {/* Update button pinned to the bottom — visible in every flow */}
        <div style={{ marginTop: 'auto' }} />
        <HubUpdateButton />
      </nav>

      {/* ─── Content ─── */}
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
      <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{flow.emoji}</span>
      <span style={{ fontSize: '0.55rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>{flow.label}</span>
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
          gap: '10px',
          padding: '5px 10px',
          borderBottom: '1px solid var(--border-subtle, #2a2a3e)',
          background: 'var(--bg-secondary, #16161e)',
          fontSize: '0.68rem',
          color: 'var(--text-muted, #9b98ae)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, color: flow.color || 'var(--accent-primary)' }}>{flow.emoji} {flow.label}</span>
        <span style={{ opacity: 0.8 }}>{ready ? 'Nếu trống → bấm Tải lại.' : 'Đang chờ server khởi động…'}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button onClick={reload} title="Tải lại" style={toolbarBtn}>
            <RotateCw size={13} /> Tải lại
          </button>
          <a href={url} target="_blank" rel="noreferrer" title="Mở tab mới" style={{ ...toolbarBtn, textDecoration: 'none' }}>
            <ExternalLink size={13} /> Tab mới
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
          gap: 12, color: 'var(--text-muted, #9b98ae)', fontSize: '0.85rem',
        }}>
          <RotateCw size={22} className="spin" style={{ color: flow.color || 'var(--accent-primary)' }} />
          <div>Đang chờ server <b>{flow.label}</b> khởi động ({url.replace('http://', '')})…</div>
          <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Lần đầu chạy start.bat có thể mất ~30s để cài đặt.</div>
        </div>
      )}
    </div>
  );
}

const toolbarBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 8px',
  fontSize: '0.66rem',
  fontWeight: 600,
  border: '1px solid var(--border-subtle, #2a2a3e)',
  borderRadius: 6,
  background: 'var(--bg-elevated, #252536)',
  color: 'var(--text-secondary, #a09cb5)',
  cursor: 'pointer',
};
