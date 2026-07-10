/**
 * Hook lấy bộ chuỗi. KHÔNG subscribe store: đổi ngôn ngữ là RELOAD trang,
 * nên bộ chuỗi cố định trong suốt vòng đời một lần chạy.
 */
import { getT, getUi } from './index';
import type { TranslationKeys, UiKeys } from './index';

/** Bộ chuỗi CŨ (~293 key, tra theo resolveLocale). */
export function useT(): TranslationKeys {
  return getT();
}

/** Bộ chuỗi MỚI cho các chuỗi vốn hardcode (tra theo uiLang trực tiếp). */
export function useUi(): UiKeys {
  return getUi();
}
