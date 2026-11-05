import type { HistoryLocale } from "@/lib/history/locale";

export const LOCALE_URLS = ["ko", "en"] as const;

const PUBLIC_ROOTS = [
  "/now",
  "/about",
  "/guide",
  "/contact",
  "/history",
  "/artists",
  "/exhibitions",
  "/spaces",
  "/research",
];

export function splitLocalePath(pathname: string): { locale: HistoryLocale | null; path: string } {
  const match = pathname.match(/^\/(ko|en)(?=\/|$)/);
  if (!match) return { locale: null, path: pathname || "/" };
  const rest = pathname.slice(match[0].length);
  return { locale: match[1] as HistoryLocale, path: rest.startsWith("/") ? rest || "/" : `/${rest}` };
}

export function withLocalePrefix(path: string, locale: HistoryLocale | null): string {
  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const beforeHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = beforeHash.indexOf("?");
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";
  const bare = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const normalized = bare.startsWith("/") ? bare : `/${bare}`;
  const { path: stripped } = splitLocalePath(normalized);
  const prefixed = locale ? (stripped === "/" ? `/${locale}` : `/${locale}${stripped}`) : stripped;
  return `${prefixed}${query}${hash}`;
}

export function prefixPublicPath(path: string, locale: HistoryLocale | null): string {
  if (!locale) return path;
  const hashIndex = path.indexOf("#");
  const beforeHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const pathname = beforeHash.split("?")[0] || "/";
  const { locale: existing } = splitLocalePath(pathname);
  if (existing) return path;
  const allowed = pathname === "/" || PUBLIC_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
  if (!allowed) return path;
  return withLocalePrefix(path, locale);
}

export function swapLocalePrefix(path: string, locale: HistoryLocale): string {
  const { path: stripped } = splitLocalePath(path.split("?")[0] || "/");
  const queryIndex = path.indexOf("?");
  const query = queryIndex >= 0 ? path.slice(queryIndex) : "";
  const { locale: current } = splitLocalePath(path.split("?")[0] || "/");
  if (!current) return `${stripped}${query}`;
  return `${withLocalePrefix(stripped, locale)}${query}`;
}
