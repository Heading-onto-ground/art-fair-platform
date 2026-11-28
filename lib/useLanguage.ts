"use client";

import { useLocaleState } from "@/lib/i18n/LocaleProvider";
import { isProductionLocale, type ProductionLocale } from "@/lib/i18n/registry";

export type Language = ProductionLocale | "fr";

/**
 * The visible language is the locale the server already resolved.
 * A post-hydration effect must not replace it.
 */
export function useLanguage(initial?: Language) {
  const { locale, setLocale } = useLocaleState();
  const lang = (isProductionLocale(initial) ? initial : locale) as Language;

  return {
    lang,
    setLang: (value: Language) => setLocale(value),
    mounted: true,
  };
}
