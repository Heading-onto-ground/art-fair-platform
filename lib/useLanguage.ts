"use client";

import { useEffect, useState } from "react";

export type Language = "en" | "ko" | "ja" | "fr";

const DEFAULT_LANG: Language = "en";

export function useLanguage() {
  const [lang, setLang] = useState<Language>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined") {
      const stored = localStorage.getItem("afp_lang") as Language | null;
      if (stored) {
        setLang(stored);
        return;
      }
      const detected = navigator.language.slice(0, 2) as Language;
      setLang(detected || DEFAULT_LANG);
    }
  }, []);

  return {
    lang: mounted ? lang : DEFAULT_LANG,
    setLang: (v: Language) => {
      setLang(v);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("afp_lang", v);
      }
    },
    mounted,
  };
}
