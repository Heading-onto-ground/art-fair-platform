import type { HistoryLocale } from "@/lib/history/locale";
import { splitLocalePath } from "@/lib/history/localeUrl";
import { PRODUCTION_LOCALES } from "@/lib/i18n/registry";

/**
 * English and Korean remain the indexed baseline for every existing public URL.
 * Japanese and both Chinese scripts are indexed only where the fixed interface
 * is actually translated. Original artist, artwork, and exhibition wording does
 * not count as a missing translation.
 */
const PUBLIC_LOCALIZED_ROOTS = [
  "/history",
  "/artists",
  "/exhibitions",
  "/spaces",
  "/login",
  "/galleries",
  "/open-calls",
  "/artist/public",
] as const;

const INDEXED_BASE_LOCALES = ["en", "ko"] as const satisfies readonly HistoryLocale[];

export function pathHasPublicLocalization(path: string): boolean {
  const raw = path.split("?")[0].split("#")[0] || "/";
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  const { path: bare } = splitLocalePath(normalized);
  if (bare === "/") return true;
  return PUBLIC_LOCALIZED_ROOTS.some((root) => bare === root || bare.startsWith(`${root}/`));
}

export function indexLocalesForPath(path: string): readonly HistoryLocale[] {
  return pathHasPublicLocalization(path) ? PRODUCTION_LOCALES : INDEXED_BASE_LOCALES;
}
