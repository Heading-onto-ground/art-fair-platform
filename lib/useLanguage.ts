"use client";

import { useLocaleState } from "@/lib/i18n/LocaleProvider";

export type Language = "en" | "ko" | "ja" | "fr";

/**
 * The visible language is the locale the server already resolved.
 * A post-hydration effect must not replace it. ja/fr selections fall back
 * inside the provider because those locales are not production-enabled.
 */
export function useLanguage(initial?: Language) {
  const { locale, setLocale } = useLocaleState();
  const lang = (initial === "ko" || initial === "en" ? initial : locale) as Language;

  return {
    lang,
    setLang: (value: Language) => setLocale(value),
    mounted: true,
  };
}
