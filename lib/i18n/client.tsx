"use client";

import { createContext, useContext } from "react";
import { DICTIONARIES, DEFAULT_LOCALE, type Locale } from "./index";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  return DICTIONARIES[useContext(LocaleContext)];
}
