/**
 * preset-tool/src/i18n/index.ts — Ngôn ngữ giao diện cho Tạo Preset.
 *
 * Tạo Preset chạy trong iframe của Hub; Hub truyền `?lang=vi|en|zh` xuống URL.
 * App này thuần client (Vite, không SSR) nên chỉ cần đọc URL/localStorage một lần
 * lúc nạp module — không có nguy cơ lệch hydration như Next.
 */
import en from './en';
import vi from './vi';
import zh from './zh';
import type { PresetUiKeys } from './en';

export type PresetUiLang = 'vi' | 'en' | 'zh';

const DICTS: Record<PresetUiLang, PresetUiKeys> = { vi, en, zh };
const LS_KEY = 'st-ui-lang';

const isLang = (v: unknown): v is PresetUiLang => v === 'vi' || v === 'en' || v === 'zh';

/** Ưu tiên ?lang= (Hub truyền xuống), rồi localStorage, mặc định Tiếng Việt. */
export function getUiLang(): PresetUiLang {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isLang(fromUrl)) {
      try { localStorage.setItem(LS_KEY, fromUrl); } catch { /* ignore */ }
      return fromUrl;
    }
  } catch { /* ignore */ }
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (isLang(saved)) return saved;
  } catch { /* ignore */ }
  return 'vi';
}

/** Bộ chuỗi cho ngôn ngữ đang chọn — cố định suốt vòng đời trang (đổi ngôn ngữ = Hub reload). */
export const t: PresetUiKeys = DICTS[getUiLang()];

/** Thay {key} bằng giá trị. */
export function fmt(tpl: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), tpl);
}

export type { PresetUiKeys };
