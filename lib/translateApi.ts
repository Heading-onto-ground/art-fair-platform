/**
 * 자동 번역 API
 * Google Translate 무료 API 사용 (일일 제한 있음)
 * 프로덕션에서는 Google Cloud Translation 또는 DeepL API 권장
 */

export type SupportedLang = "ko" | "en" | "ja" | "zh" | "fr" | "de" | "es";

export const LANGUAGE_NAMES: Record<SupportedLang, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

/**
 * 텍스트 번역 (Google Translate 무료 API)
 */
export async function translateText(
  text: string,
  targetLang: SupportedLang,
  sourceLang: SupportedLang | "auto" = "auto"
): Promise<{ translated: string; detectedLang?: string }> {
  if (!text.trim()) {
    return { translated: text };
  }

  try {
    // Google Translate 무료 API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Translation failed: ${res.status}`);
    }

    const data = await res.json();

    // 응답 파싱: [[["번역문","원문",null,null,10]],null,"감지된언어"]
    let translated = "";
    if (Array.isArray(data[0])) {
      for (const segment of data[0]) {
        if (segment[0]) {
          translated += segment[0];
        }
      }
    }

    const detectedLang = data[2] || undefined;

    return { translated: translated || text, detectedLang };
  } catch (error) {
    console.error("Translation error:", error);
    return { translated: text }; // 실패 시 원문 반환
  }
}

/**
 * 여러 텍스트 일괄 번역
 */
export async function translateBatch(
  texts: string[],
  targetLang: SupportedLang,
  sourceLang: SupportedLang | "auto" = "auto"
): Promise<string[]> {
  const results = await Promise.all(
    texts.map((text) => translateText(text, targetLang, sourceLang))
  );
  return results.map((r) => r.translated);
}

/**
 * 언어 감지
 */
export async function detectLanguage(text: string): Promise<SupportedLang | null> {
  if (!text.trim()) return null;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text.slice(0, 100))}`;
    const res = await fetch(url);
    const data = await res.json();
    return (data[2] as SupportedLang) || null;
  } catch {
    return null;
  }
}

/**
 * 사용자 언어가 텍스트 언어와 다른지 확인
 */
export function needsTranslation(textLang: string, userLang: string): boolean {
  return textLang !== userLang && textLang !== "auto";
}
