import {
  countryLocale,
  isProductionLocale,
  localeDefinition,
  productionLocaleList,
  type ProductionLocale,
} from "@/lib/i18n/registry";

export type LocaleSource = "url" | "account" | "cookie" | "country" | "accept-language" | "fallback";

export type ResolveLocaleInput = {
  urlLocale?: string | null;
  /** Honored only when it is already a production locale. No account column is read in this phase. */
  accountLocale?: string | null;
  cookieLocale?: string | null;
  /** ISO 3166-1 alpha-2 from the platform edge, never a raw IP. */
  country?: string | null;
  acceptLanguage?: string | null;
};

export type ResolvedLocale = {
  locale: ProductionLocale;
  source: LocaleSource;
};

const CHINESE_HANT_REGIONS = new Set(["tw", "hk", "mo"]);

/**
 * Reads a BCP 47 tag without a special case per country.
 * Chinese is the exception: one language has two production scripts.
 * Other production locales match their language subtag, so de-DE matches de
 * once German is enabled. pt-BR and pt-PT both match pt until a regional
 * dictionary is approved.
 */
function parseLanguageTag(tag: string): { language: string; script: string | null; region: string | null } | null {
  const parts = tag.toLowerCase().split("-").filter(Boolean);
  if (!parts.length || !/^[a-z]{2,3}$/.test(parts[0])) return null;
  let script: string | null = null;
  let region: string | null = null;
  for (const part of parts.slice(1)) {
    if (!script && /^[a-z]{4}$/.test(part)) script = part;
    else if (!region && (/^[a-z]{2}$/.test(part) || /^[0-9]{3}$/.test(part))) region = part;
  }
  return { language: parts[0], script, region };
}

function enabled(code: ProductionLocale): ProductionLocale | null {
  return isProductionLocale(code) ? code : null;
}

function tagLocale(tag: string): ProductionLocale | null {
  const parsed = parseLanguageTag(tag);
  if (!parsed) return null;
  if (parsed.language === "zh") {
    if (parsed.script === "hant" || (!parsed.script && parsed.region && CHINESE_HANT_REGIONS.has(parsed.region))) {
      return enabled("zh-Hant");
    }
    return enabled("zh-Hans");
  }
  const match = productionLocaleList().find((item) => item.code.toLowerCase() === parsed.language);
  return match && isProductionLocale(match.code) ? match.code : null;
}

function matchAccept(header: string | null | undefined): ProductionLocale | null {
  if (!header) return null;
  const tags = header.split(",").map((part) => {
    const [tag, ...params] = part.trim().split(";");
    const qParam = params.find((item) => item.trim().toLowerCase().startsWith("q="));
    const q = qParam ? Number(qParam.split("=")[1]) : 1;
    return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 0 };
  });
  tags.sort((a, b) => b.q - a.q);
  for (const item of tags) {
    if (!(item.q > 0)) continue;
    const locale = tagLocale(item.tag);
    if (locale) return locale;
  }
  return null;
}

function explicitStoredLocale(value: string | null | undefined): ProductionLocale | null {
  if (!value) return null;
  if (isProductionLocale(value)) return value;
  const known = localeDefinition(value);
  if (known && !known.productionEnabled) return known.fallback;
  return null;
}

/**
 * One language decision for the whole site.
 * URL, then account (when a production value already exists), then an explicit
 * cookie, then a supported country language. A multilingual country, or a
 * country whose language is not in production, uses a supported Accept-Language
 * tag. q=0 tags are ignored. English is the last fallback.
 * A stored choice for a language that is not in production falls back to
 * English and still beats country detection. Japanese and Chinese choices stay.
 */
export function resolveLocale(input: ResolveLocaleInput = {}): ResolvedLocale {
  if (isProductionLocale(input.urlLocale)) return { locale: input.urlLocale, source: "url" };

  if (isProductionLocale(input.accountLocale)) return { locale: input.accountLocale, source: "account" };

  const cookie = explicitStoredLocale(input.cookieLocale);
  if (cookie && input.cookieLocale) return { locale: cookie, source: "cookie" };

  const country = countryLocale(input.country);
  if (country === "multilingual") {
    return { locale: matchAccept(input.acceptLanguage) ?? "en", source: "country" };
  }
  if (country?.productionEnabled && isProductionLocale(country.code)) {
    return { locale: country.code, source: "country" };
  }
  if (country) {
    const accepted = matchAccept(input.acceptLanguage);
    if (accepted) return { locale: accepted, source: "accept-language" };
    return { locale: "en", source: "fallback" };
  }

  const accepted = matchAccept(input.acceptLanguage);
  if (accepted) return { locale: accepted, source: "accept-language" };

  return { locale: "en", source: "fallback" };
}
