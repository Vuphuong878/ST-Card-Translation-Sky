/**
 * mod-card/src/i18n/index.ts — Ngôn ngữ giao diện cho Mod Card.
 *
 * Mod Card chạy trong iframe của Hub; Hub truyền `?lang=vi|en|zh` xuống URL.
 * Server component (`app/page.tsx`) đọc `searchParams` rồi truyền `lang` xuống client
 * ⇒ HTML server và client khớp nhau, KHÔNG lệch hydration, KHÔNG nháy ngôn ngữ.
 */
import en from './en';
import vi from './vi';
import zh from './zh';
import type { ModUiKeys } from './en';

export type ModUiLang = 'vi' | 'en' | 'zh';

const DICTS: Record<ModUiLang, ModUiKeys> = { vi, en, zh };

/** Chuẩn hoá giá trị ?lang= (mặc định Tiếng Việt). */
export function normalizeLang(raw: string | string[] | undefined): ModUiLang {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === 'en' || v === 'zh' ? v : 'vi';
}

export function getDict(lang: ModUiLang): ModUiKeys {
  return DICTS[lang];
}

/** Thay {key} bằng giá trị. Dùng cho chuỗi có placeholder ({count}, {label}…). */
export function fmt(tpl: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    tpl,
  );
}

export type { ModUiKeys };
