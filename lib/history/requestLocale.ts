import { cookies, headers } from "next/headers";
import { ROB_LOCALE_COOKIE, type HistoryLocale } from "@/lib/history/locale";
import { prefixPublicPath } from "@/lib/history/localeUrl";
import { isProductionLocale } from "@/lib/i18n/registry";
import { resolveLocale, type ResolvedLocale } from "@/lib/i18n/resolveLocale";
import { localeSimulationEnabled } from "@/lib/i18n/simulation";

export function pinnedLocale(): HistoryLocale | null {
  const list = headers();
  if (list.get("x-rob-locale-pinned") !== "1") return null;
  const value = list.get("x-rob-locale");
  return isProductionLocale(value) ? value : null;
}

export function requestPath(): string {
  const value = headers().get("x-rob-path");
  return value && value.startsWith("/") ? value : "/";
}

function edgeCountry(): string | null {
  const list = headers();
  if (localeSimulationEnabled()) {
    const simulated = cookies().get("rob_country_sim")?.value;
    if (simulated && /^[A-Za-z]{2}$/.test(simulated)) return simulated.toUpperCase();
  }
  const header = list.get("x-vercel-ip-country");
  if (header && /^[A-Za-z]{2}$/.test(header)) return header.toUpperCase();
  return null;
}

/** Account language is intentionally absent until a column is approved. */
export function requestLocale(): ResolvedLocale {
  const list = headers();
  return resolveLocale({
    urlLocale: pinnedLocale(),
    accountLocale: null,
    cookieLocale: cookies().get(ROB_LOCALE_COOKIE)?.value,
    country: edgeCountry(),
    acceptLanguage: list.get("accept-language"),
  });
}

export function historyLocale(): HistoryLocale {
  return requestLocale().locale;
}

export function pinnedPath(path: string): string {
  return prefixPublicPath(path, pinnedLocale());
}
