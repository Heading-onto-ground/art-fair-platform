/**
 * ROB language registry.
 *
 * Product principle: the interface uses the viewer's language, material sent
 * to a gallery uses that gallery's working language, and artwork titles and
 * historical records stay in their original wording.
 *
 * Only English and Korean are production-enabled. Other codes exist so a
 * country can fall back predictably. They are not public URLs and not SEO
 * targets until their dictionary and core journeys are verified.
 *
 * Mobile (mobile/lib/i18n.ts, mobile/lib/useLanguage.ts) is unchanged in this
 * phase. A later mobile pass should consume these same production codes and
 * the same resolution order instead of adding another resolver.
 */

export const PRODUCTION_LOCALES = ["en", "ko"] as const;

export type ProductionLocale = (typeof PRODUCTION_LOCALES)[number];

export type LocaleCode =
  | ProductionLocale
  | "ja"
  | "zh-Hans"
  | "zh-Hant"
  | "de"
  | "fr"
  | "es"
  | "it"
  | "pt"
  | "nl"
  | "ar"
  | "ru"
  | "id"
  | "th"
  | "vi"
  | "tr"
  | "pl";

export type LocaleDefinition = {
  code: LocaleCode;
  nativeName: string;
  dir: "ltr" | "rtl";
  fallback: ProductionLocale;
  /** Single-language countries whose default is this locale. */
  countries: readonly string[];
  dictionary: boolean;
  publicUrl: boolean;
  seo: boolean;
  productionEnabled: boolean;
};

export const LOCALE_REGISTRY: readonly LocaleDefinition[] = [
  { code: "en", nativeName: "English", dir: "ltr", fallback: "en", countries: ["US", "GB", "AU", "IE", "NZ"], dictionary: true, publicUrl: true, seo: true, productionEnabled: true },
  { code: "ko", nativeName: "한국어", dir: "ltr", fallback: "en", countries: ["KR"], dictionary: true, publicUrl: true, seo: true, productionEnabled: true },
  { code: "ja", nativeName: "日本語", dir: "ltr", fallback: "en", countries: ["JP"], dictionary: true, publicUrl: false, seo: false, productionEnabled: false },
  { code: "zh-Hans", nativeName: "简体中文", dir: "ltr", fallback: "en", countries: ["CN"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "zh-Hant", nativeName: "繁體中文", dir: "ltr", fallback: "en", countries: ["TW", "MO"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "de", nativeName: "Deutsch", dir: "ltr", fallback: "en", countries: ["DE", "AT"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "fr", nativeName: "Français", dir: "ltr", fallback: "en", countries: ["FR"], dictionary: true, publicUrl: false, seo: false, productionEnabled: false },
  { code: "es", nativeName: "Español", dir: "ltr", fallback: "en", countries: ["ES", "MX"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "it", nativeName: "Italiano", dir: "ltr", fallback: "en", countries: ["IT"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "pt", nativeName: "Português", dir: "ltr", fallback: "en", countries: ["BR", "PT"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "nl", nativeName: "Nederlands", dir: "ltr", fallback: "en", countries: ["NL"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "ar", nativeName: "العربية", dir: "rtl", fallback: "en", countries: ["SA", "AE", "EG", "QA"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "ru", nativeName: "Русский", dir: "ltr", fallback: "en", countries: ["RU"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "id", nativeName: "Bahasa Indonesia", dir: "ltr", fallback: "en", countries: ["ID"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "th", nativeName: "ไทย", dir: "ltr", fallback: "en", countries: ["TH"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "vi", nativeName: "Tiếng Việt", dir: "ltr", fallback: "en", countries: ["VN"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "tr", nativeName: "Türkçe", dir: "ltr", fallback: "en", countries: ["TR"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
  { code: "pl", nativeName: "Polski", dir: "ltr", fallback: "en", countries: ["PL"], dictionary: false, publicUrl: false, seo: false, productionEnabled: false },
];

/** Countries with more than one official language. Browser language may choose among production locales. */
export const MULTILINGUAL_COUNTRIES = new Set(["BE", "CH", "CA", "SG", "HK"]);

const BY_CODE = new Map(LOCALE_REGISTRY.map((item) => [item.code, item]));

const COUNTRY_TO_CODE = new Map<string, LocaleCode>();
for (const item of LOCALE_REGISTRY) {
  for (const country of item.countries) COUNTRY_TO_CODE.set(country, item.code);
}

export function localeDefinition(code: string | null | undefined): LocaleDefinition | null {
  if (!code) return null;
  return BY_CODE.get(code as LocaleCode) ?? null;
}

export function isProductionLocale(code: string | null | undefined): code is ProductionLocale {
  return code === "en" || code === "ko";
}

export function productionLocaleList(): LocaleDefinition[] {
  return LOCALE_REGISTRY.filter((item) => item.productionEnabled);
}

export function countryLocale(country: string | null | undefined): LocaleDefinition | "multilingual" | null {
  if (!country) return null;
  const code = country.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (MULTILINGUAL_COUNTRIES.has(code)) return "multilingual";
  const localeCode = COUNTRY_TO_CODE.get(code);
  return localeCode ? BY_CODE.get(localeCode) ?? null : null;
}
