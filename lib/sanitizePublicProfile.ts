/**
 * Strip fields that must not appear in unauthenticated API responses.
 */
export function sanitizePublicArtistProfile(profile: Record<string, unknown> | null) {
  if (!profile) return null;

  const safe: Record<string, unknown> = { ...profile };

  delete safe.email;
  delete safe.passwordHash;
  delete safe.notify_new_community_post;

  const portfolioUrl = String(safe.portfolioUrl || "").trim();
  if (portfolioUrl.startsWith("data:")) {
    delete safe.portfolioUrl;
    safe.hasPortfolio = true;
  } else if (portfolioUrl) {
    safe.hasPortfolio = true;
  } else {
    safe.hasPortfolio = false;
  }

  return safe;
}
