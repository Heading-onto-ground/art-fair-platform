"use client";

import { useEffect, useState } from "react";

export type Language = "en" | "ko" | "ja" | "fr";

const DEFAULT_LANG: Language = "en";

export function useLanguage() {
  const [lang, setLang] = useState<Language>(DEFAULT_LANG);

  useEffect(() => {
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
    lang,
    setLang: (v: Language) => {
      setLang(v);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("afp_lang", v);
      }
    },
  };
}
