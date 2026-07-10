'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getDict, type ModUiKeys, type ModUiLang } from './index';

const Ctx = createContext<ModUiKeys | null>(null);

/** Bọc cây client. `lang` do server component truyền xuống (đọc từ ?lang=). */
export function I18nProvider({ lang, children }: { lang: ModUiLang; children: ReactNode }) {
  const dict = useMemo(() => getDict(lang), [lang]);
  return <Ctx.Provider value={dict}>{children}</Ctx.Provider>;
}

/** Bộ chuỗi cho ngôn ngữ đang chọn. */
export function useT(): ModUiKeys {
  const dict = useContext(Ctx);
  if (!dict) throw new Error('[i18n] useT() phải nằm trong <I18nProvider>.');
  return dict;
}
