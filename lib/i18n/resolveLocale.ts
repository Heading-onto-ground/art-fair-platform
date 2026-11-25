import {
  countryLocale,
  isProductionLocale,
  localeDefinition,
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

function matchAccept(header: string | null | undefined): ProductionLocale | null {
  if (!header) return null;
  const tags = header.split(",").map((part) => {
    const [tag, ...params] = part.trim().split(";");
    const qParam = params.find((item) => item.trim().startsWith("q="));
    const q = qParam ? Number(qParam.split("=")[1]) : 1;
    return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 0 };
  });
  tags.sort((a, b) => b.q - a.q);
  for (const item of tags) {
    const base = item.tag.split("-")[0];
    if (base === "ko" || base === "en") return base;
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
 * cookie, then edge country, then Accept-Language, then English.
 * A stored ja/fr choice falls back to English and still beats country detection.
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
  if (country) {
    return {
      locale: country.productionEnabled && isProductionLocale(country.code) ? country.code : country.fallback,
      source: "country",
    };
  }

  const accepted = matchAccept(input.acceptLanguage);
  if (accepted) return { locale: accepted, source: "accept-language" };

  return { locale: "en", source: "fallback" };
}
