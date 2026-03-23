/**
 * Translation service for artist notes.
 * Uses MyMemory API (free, no key required).
 */

import type { Lang } from "@/lib/i18n";

const hasKorean = (s: string) => /[\uAC00-\uD7AF\u1100-\u11FF]/.test(s);

export async function translateNote(
  text: string,
  targetLang: Lang
): Promise<{ ok: boolean; translated?: string; error?: string }> {
  const target = targetLang === "ko" ? "ko" : "en";
  const source = hasKorean(text) ? "ko" : "en";
  if (source === target) {
    return { ok: false, error: "ALREADY_IN_LANG" };
  }
  const langpair = `${source}|${target}`;
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.responseStatus === 200 && data.responseData?.translatedText) {
      return { ok: true, translated: data.responseData.translatedText };
    }
    return {
      ok: false,
      error: data.responseData?.translatedText || `Translation failed (${res.status})`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
