"use client";

import { useEffect, useState } from "react";

type Language = "en" | "ko" | "ja" | "fr";

// 영어 국가명 → 한국어 국가명 매핑 (GEO API가 영어로 반환하므로)
const ENGLISH_TO_KO: Record<string, string> = {
  "South Korea": "한국",
  "Korea": "한국",
  "Korea, Republic of": "한국",
  "Japan": "일본",
  "United Kingdom": "영국",
  "UK": "영국",
  "United States": "미국",
  "USA": "미국",
  "France": "프랑스",
  "Germany": "독일",
  "Deutschland": "독일",
  "Italy": "이탈리아",
  "Italia": "이탈리아",
  "Switzerland": "스위스",
  "Schweiz": "스위스",
  "China": "중국",
  "Australia": "호주",
};

// 한국어 국가명 → 언어 코드 매핑
const COUNTRY_LANG: Record<string, Language> = {
  한국: "ko",
  일본: "ja",
  영국: "en",
  미국: "en",
  프랑스: "fr",
  독일: "en",
  이탈리아: "en",
  스위스: "en",
  중국: "en",
  호주: "en",
};

function detectLanguageFromNavigator(): Language {
  if (typeof navigator === "undefined") return "en";
  const lang = (navigator.language || "en").toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("fr")) return "fr";
  return "en";
}

function normalizeCountry(raw: string): string {
  if (!raw) return "";
  // 이미 한국어 국가명인 경우 그대로 반환
  if (COUNTRY_LANG[raw]) return raw;
  // 영어 → 한국어 변환
  return ENGLISH_TO_KO[raw] || raw;
}

export function useAutoLocale() {
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [language, setLanguage] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedCountry = localStorage.getItem("afp_country") || "";
    const storedCity = localStorage.getItem("afp_city") || "";
    const storedLang = (localStorage.getItem("afp_lang") || "") as Language;
    if (storedCountry) setCountry(storedCountry);
    if (storedCity) setCity(storedCity);
    if (storedLang) setLanguage(storedLang);

    const fallbackLang = detectLanguageFromNavigator();
    if (!storedLang) {
      setLanguage(fallbackLang);
      localStorage.setItem("afp_lang", fallbackLang);
    }

    const applyLocale = (c?: string | null, ci?: string | null) => {
      if (c) {
        const normalized = normalizeCountry(c);
        setCountry(normalized);
        localStorage.setItem("afp_country", normalized);
        const lang = COUNTRY_LANG[normalized] || fallbackLang;
        setLanguage(lang);
        localStorage.setItem("afp_lang", lang);
      }
      if (ci) {
        setCity(ci);
        localStorage.setItem("afp_city", ci);
      }
    };

    // IP 기반 (fallback)
    fetch("/api/geo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => applyLocale(d?.country, d?.city))
      .catch(() => {});

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const qs = `?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`;
          fetch(`/api/geo${qs}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((d) => applyLocale(d?.country, d?.city))
            .catch(() => {});
        },
        () => {
          // ignore permission denied
        },
        { timeout: 4000 }
      );
    }
  }, []);

  return { 
    country: mounted ? country : "", 
    city: mounted ? city : "", 
    language: mounted ? language : "en",
    mounted 
  };
}
