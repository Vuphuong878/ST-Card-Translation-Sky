// ─── Tool flows for the Hub switcher ───
// The translate tool is the HOST app (kind: 'native' — rendered in-process, never unmounted
// so a running translation keeps going when you switch away). Other tools are embedded as
// iframes (kind: 'iframe') that also stay mounted when hidden, so their state/progress is
// preserved across switches. Add more flows here later (e.g. a card-mod tool) — one entry each.
export type FlowKind = 'native' | 'iframe';

export interface FlowDef {
  id: string;
  /** Short label under the rail icon */
  label: string;
  /** Emoji shown as the rail icon (keeps the rail dependency-free) */
  emoji: string;
  kind: FlowKind;
  /** For iframe flows: the dev-server URL of that tool. Overridable via env. */
  url?: string;
  /** Accent color for the active state */
  color?: string;
}

export const FLOWS: FlowDef[] = [
  {
    id: 'translate',
    label: 'Dịch Card',
    emoji: '🌐',
    kind: 'native',
    color: 'var(--accent-primary)',
  },
  {
    id: 'card-creator',
    label: 'Tạo Card',
    emoji: '🃏',
    kind: 'iframe',
    // Card-creator (tao-card) runs on its own fixed vite port. Override with VITE_CARD_TOOL_URL.
    url: (import.meta as any).env?.VITE_CARD_TOOL_URL || 'http://localhost:5174',
    color: '#f59e0b',
  },
  {
    id: 'preset',
    label: 'Tạo Preset',
    emoji: '🎛️',
    kind: 'iframe',
    // preset-tool (Vite) on fixed port 5175.
    url: (import.meta as any).env?.VITE_PRESET_TOOL_URL || 'http://localhost:5175',
    color: '#22c55e',
  },
  {
    id: 'mod-card',
    label: 'Mod Card',
    emoji: '🛠️',
    kind: 'iframe',
    // mod-card (Next.js) on fixed port 5176.
    url: (import.meta as any).env?.VITE_MODCARD_TOOL_URL || 'http://localhost:5176',
    color: '#a855f7',
  },
  {
    id: 'novalcard',
    label: 'Trích Card',
    emoji: '🔍',
    kind: 'iframe',
    // NovalCard — công cụ trích xuất thẻ (1 file HTML tĩnh tự chứa). Không cần dev-server
    // riêng: hub tự serve từ public/apps → cùng origin, load tức thì, không thêm port/start.bat.
    url: '/apps/novalcard-vi.html',
    color: '#c8a86b',
  },
];
