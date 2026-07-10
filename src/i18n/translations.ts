/**
 * src/i18n/translations.ts — SHIM giữ tương thích import cũ.
 * Bộ chuỗi đã tách sang `./locales/{en,vi,zh}.ts` để Vite tách chunk theo ngôn ngữ.
 * Logic ngôn ngữ nằm ở `./index.ts`.
 */
export type { TranslationKeys } from './locales/en';
export type { Locale, UiLang } from './index';
