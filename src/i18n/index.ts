/**
 * src/i18n/index.ts — Ngôn ngữ giao diện (VI / EN / 中文).
 * ──────────────────────────────────────────────────────────────────────────────
 * Đổi ngôn ngữ = ghi localStorage rồi RELOAD trang. Nhờ vậy chỉ cần nạp ĐÚNG 1 bộ chuỗi
 * (dynamic import → Vite tách chunk riêng cho từng ngôn ngữ) ⇒ app nhẹ, không phải giữ
 * 3 cây ngôn ngữ trong bộ nhớ, không cần re-render toàn app khi đổi.
 *
 * ⚠️ HAI BỘ TỪ ĐIỂN, HAI CÁCH TRA — cố ý:
 *   1. `locales/*`  (bộ CŨ, ~293 key)  → tra theo `resolveLocale(uiLang)`.
 *   2. `ui/*`       (bộ MỚI, chuỗi vốn hardcode) → tra theo `uiLang` TRỰC TIẾP.
 * Xem giải thích ở `resolveLocale`.
 */
import type { TranslationKeys } from './locales/en';
import type { UiKeys } from './ui/en';

/** Ngôn ngữ user chọn (thứ hiện trên nút). */
export type UiLang = 'vi' | 'en' | 'zh';
/** Locale nội bộ của bộ từ điển CŨ (`locales/*`) + 237 nhánh `isVi` trong code. */
export type Locale = 'en' | 'vi' | 'zh';

const LS_KEY = 'st-ui-lang';
const DEFAULT_LANG: UiLang = 'vi';

export const UI_LANGS: { id: UiLang; short: string; title: string }[] = [
  { id: 'vi', short: 'VI', title: 'Tiếng Việt' },
  { id: 'en', short: 'EN', title: 'English' },
  { id: 'zh', short: '中文', title: '简体中文' },
];

const isUiLang = (v: unknown): v is UiLang => v === 'vi' || v === 'en' || v === 'zh';

/** Ngôn ngữ hiện tại (ưu tiên ?lang= trên URL, rồi localStorage, mặc định Tiếng Việt). */
export function getUiLang(): UiLang {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isUiLang(fromUrl)) return fromUrl;
  } catch { /* SSR / test: bỏ qua */ }
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (isUiLang(saved)) return saved;
  } catch { /* localStorage bị chặn: bỏ qua */ }
  return DEFAULT_LANG;
}

/** Đổi ngôn ngữ: lưu rồi RELOAD (theo đúng yêu cầu — nạp lại trang cho nhẹ app). */
export function setUiLang(lang: UiLang): void {
  try { localStorage.setItem(LS_KEY, lang); } catch { /* ignore */ }
  try { window.location.reload(); } catch { /* ignore */ }
}

/**
 * uiLang → locale cho bộ từ điển CŨ (`locales/*`).
 *
 * ⚠️ `'vi' → 'en'` LÀ CỐ Ý, KHÔNG PHẢI LỖI:
 * Mặc định cũ của app là `locale='en'`, nên hôm nay các label đi qua i18n hiển thị TIẾNG ANH
 * ("API Configuration", "Expert Mode"…) và 237 nhánh `isVi ? viText : enText` cũng rơi vào
 * nhánh TIẾNG ANH. User cũ đã quen đúng bộ mặt đó. Map vi→en giữ giao diện Y HỆT hiện tại.
 * (Muốn bật tiếng Việt đầy đủ về sau: đổi đúng dòng này thành `ui === 'vi' ? 'vi' : ...`.)
 */
export const resolveLocale = (ui: UiLang): Locale => (ui === 'zh' ? 'zh' : 'en');

// Mỗi loader = 1 chunk riêng do Vite tách; chỉ chunk của ngôn ngữ đang dùng được tải về.
const legacyLoaders: Record<Locale, () => Promise<{ default: TranslationKeys }>> = {
  en: () => import('./locales/en'),
  vi: () => import('./locales/vi'),
  zh: () => import('./locales/zh'),
};
const uiLoaders: Record<UiLang, () => Promise<{ default: UiKeys }>> = {
  vi: () => import('./ui/vi'),
  en: () => import('./ui/en'),
  zh: () => import('./ui/zh'),
};

let _t: TranslationKeys | null = null;
let _ui: UiKeys | null = null;

/** Nạp bộ chuỗi cho ngôn ngữ đang chọn. PHẢI await xong TRƯỚC khi render (xem main.tsx). */
export async function loadI18n(lang: UiLang): Promise<void> {
  const [legacy, uiMod] = await Promise.all([
    legacyLoaders[resolveLocale(lang)](),
    uiLoaders[lang](),
  ]);
  _t = legacy.default;
  _ui = uiMod.default;
}

export function getT(): TranslationKeys {
  if (!_t) throw new Error('[i18n] Chưa nạp: phải gọi loadI18n() trước khi render.');
  return _t;
}
export function getUi(): UiKeys {
  if (!_ui) throw new Error('[i18n] Chưa nạp: phải gọi loadI18n() trước khi render.');
  return _ui;
}

export type { TranslationKeys, UiKeys };
