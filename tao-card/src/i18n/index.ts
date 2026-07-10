/**
 * tao-card/src/i18n/index.ts — Ngôn ngữ giao diện cho Tạo Card.
 *
 * Tạo Card chạy trong iframe của Hub; Hub truyền `?lang=vi|en|zh` xuống URL.
 * App thuần client (Vite, không SSR) nên chốt ngôn ngữ một lần lúc nạp module.
 *
 * ⚠️ KHÔNG i18n hoá (dịch vào là hỏng):
 *   - `src/prompts/**` và mọi `lib/ai/*Prompts.ts` — văn bản gửi cho AI.
 *   - Dữ liệu mẫu ghi thẳng vào thẻ của người dùng: `lib/templates/cardTemplates.ts`,
 *     `lib/ai/worldbuildingDefaults.ts`, `lib/mvuzod/templateLibrary.ts`,
 *     `lib/mvuzod/gameHtmlTemplates.ts`, `components/ejs/ejsSnippets.ts`.
 *   - Chuỗi dùng làm logic: tên biến MVU, key localStorage, status enum, path.
 */
import en from './en';
import vi from './vi';
import zh from './zh';
import type { CardUiKeys } from './en';

export type CardUiLang = 'vi' | 'en' | 'zh';

const DICTS: Record<CardUiLang, CardUiKeys> = { vi, en, zh };
const LS_KEY = 'st-ui-lang';

const isLang = (v: unknown): v is CardUiLang => v === 'vi' || v === 'en' || v === 'zh';

/** Ưu tiên ?lang= (Hub truyền xuống), rồi localStorage, mặc định Tiếng Việt. */
export function getUiLang(): CardUiLang {
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
export const t: CardUiKeys = DICTS[getUiLang()];

/** Thay {key} bằng giá trị. */
export function fmt(tpl: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), tpl);
}

export type { CardUiKeys };
