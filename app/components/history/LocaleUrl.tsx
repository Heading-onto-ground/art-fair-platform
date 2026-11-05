"use client";

import { createContext, useContext } from "react";
import type { HistoryLocale } from "@/lib/history/locale";
import { prefixPublicPath } from "@/lib/history/localeUrl";

const LocaleUrlContext = createContext<HistoryLocale | null>(null);

export function LocaleUrlProvider({
  locale,
  children,
}: {
  locale: HistoryLocale | null;
  children: React.ReactNode;
}) {
  return <LocaleUrlContext.Provider value={locale}>{children}</LocaleUrlContext.Provider>;
}

export function usePublicHref() {
  const locale = useContext(LocaleUrlContext);
  return (path: string) => prefixPublicPath(path, locale);
}
