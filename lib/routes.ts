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
] as const;
