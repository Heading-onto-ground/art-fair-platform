import { describe, expect, it } from "vitest";
import { dictionaryGaps, getAvailableLanguages } from "@/lib/translate";
import { prefixPublicPath } from "@/lib/history/localeUrl";
import { productionLocaleList } from "@/lib/i18n/registry";
import { resolveLocale } from "@/lib/i18n/resolveLocale";

describe("unified locale resolver", () => {
  it("maps a new visitor from country, then browser language, then English", () => {
    expect(resolveLocale({ country: "KR", acceptLanguage: "en-US" })).toEqual({ locale: "ko", source: "country" });
    expect(resolveLocale({ country: "US", acceptLanguage: "ko-KR" })).toEqual({ locale: "en", source: "country" });
    expect(resolveLocale({ country: "JP", acceptLanguage: "ja-JP" })).toEqual({ locale: "en", source: "country" });
    expect(resolveLocale({ country: "DE", acceptLanguage: "de-DE" })).toEqual({ locale: "en", source: "country" });
    expect(resolveLocale({ country: "ZZ", acceptLanguage: "ko-KR,ko;q=0.9" })).toEqual({ locale: "ko", source: "accept-language" });
    expect(resolveLocale({ acceptLanguage: "ja-JP,ja;q=0.9" })).toEqual({ locale: "en", source: "fallback" });
    expect(resolveLocale({})).toEqual({ locale: "en", source: "fallback" });
  });

  it("keeps an explicit choice when the country changes", () => {
    expect(resolveLocale({ country: "KR", cookieLocale: "en" })).toEqual({ locale: "en", source: "cookie" });
    expect(resolveLocale({ country: "US", cookieLocale: "ko" })).toEqual({ locale: "ko", source: "cookie" });
    expect(resolveLocale({ country: "DE", cookieLocale: "ko" })).toEqual({ locale: "ko", source: "cookie" });
  });

  it("lets an explicit locale URL beat country, cookie, and account", () => {
    expect(resolveLocale({ urlLocale: "en", country: "KR", cookieLocale: "ko", acceptLanguage: "ko" })).toEqual({ locale: "en", source: "url" });
    expect(resolveLocale({ urlLocale: "ko", country: "US", cookieLocale: "en" })).toEqual({ locale: "ko", source: "url" });
    expect(resolveLocale({ urlLocale: "en", cookieLocale: "ko" })).toEqual({ locale: "en", source: "url" });
    expect(resolveLocale({ urlLocale: "ko", cookieLocale: "en" })).toEqual({ locale: "ko", source: "url" });
  });

  it("uses an existing account language only when no URL locale is present", () => {
    expect(resolveLocale({ accountLocale: "ko", cookieLocale: "en", country: "US" })).toEqual({ locale: "ko", source: "account" });
    expect(resolveLocale({ urlLocale: "en", accountLocale: "ko" })).toEqual({ locale: "en", source: "url" });
  });

  it("falls a stored Japanese or French choice back to English without asking the country again", () => {
    expect(resolveLocale({ cookieLocale: "ja", country: "KR" })).toEqual({ locale: "en", source: "cookie" });
    expect(resolveLocale({ cookieLocale: "fr", country: "FR" })).toEqual({ locale: "en", source: "cookie" });
  });

  it("uses the browser language for a multilingual country", () => {
    expect(resolveLocale({ country: "CH", acceptLanguage: "ko-KR" })).toEqual({ locale: "ko", source: "country" });
    expect(resolveLocale({ country: "CA", acceptLanguage: "fr-CA" })).toEqual({ locale: "en", source: "country" });
  });

  it("keeps the public portfolio inside the explicit locale", () => {
    expect(prefixPublicPath("/artist/public/1wh13", "en")).toBe("/en/artist/public/1wh13");
    expect(prefixPublicPath("/artist/public/1wh13", "ko")).toBe("/ko/artist/public/1wh13");
    expect(prefixPublicPath("/login", "en")).toBe("/en/login");
    expect(prefixPublicPath("/open-calls", "ko")).toBe("/ko/open-calls");
  });

  it("offers only production locales and has English and Korean for every dictionary key", () => {
    expect(getAvailableLanguages().map((item) => item.code)).toEqual(["en", "ko"]);
    expect(productionLocaleList().map((item) => item.code)).toEqual(["en", "ko"]);
    expect(dictionaryGaps("en")).toEqual([]);
    expect(dictionaryGaps("ko")).toEqual([]);
    expect(productionLocaleList().every((item) => item.seo && item.publicUrl)).toBe(true);
  });
});
