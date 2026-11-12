// Single source of truth for auth-gated route prefixes.
// Used by middleware.ts (access control) and app/robots.ts (crawler exclusion)
// so the two can never drift apart.

export const PROTECTED_PREFIXES = [
  "/artist/me",
  "/gallery/me",
  "/curator/me",
  "/chat",
  "/shipments",
  "/feed",
  "/network",
  "/discover",
  "/exhibitions/new",
] as const;

// Additional paths that are public but should not be indexed
// (auth pages, machine routes, embeds, dev pages).
export const NOINDEX_PATHS = [
  "/api/",
  "/admin",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/embed/",
  "/verify-day1",
  "/research",
  "/pro",
] as const;

/** Public legacy surfaces that stay reachable but must not be search documents. */
export const LEGACY_NOINDEX_EXACT = [
  "/artists",
  "/about",
  "/now",
  "/open-calls",
  "/galleries",
  "/community",
  "/curators",
  "/guide",
  "/a-moim",
] as const;

export const LEGACY_NOINDEX_PREFIXES = [
  "/open-calls/",
  "/galleries/",
  "/community/",
  "/curators/",
  "/country/",
  "/city/",
  "/artist/public",
  "/guide/",
  "/a-moim/",
] as const;

export function legacyNoindexPath(pathname: string): boolean {
  if ((LEGACY_NOINDEX_EXACT as readonly string[]).includes(pathname)) return true;
  return LEGACY_NOINDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}
