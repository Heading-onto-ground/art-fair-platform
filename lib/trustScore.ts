type ArtistTrustInput = {
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  instagram?: string | null;
  website?: string | null;
  profileImage?: string | null;
  hasPortfolio?: boolean;
  seriesCount?: number;
  artEventCount?: number;
  exhibitionCount?: number;
};

export type TrustLevel = "basic" | "verified" | "trusted";

export type ArtistTrustResult = {
  score: number;
  level: TrustLevel;
  signals: string[];
};

function hasText(value?: string | null) {
  return !!String(value || "").trim();
}

export function computeArtistTrust(input: ArtistTrustInput): ArtistTrustResult {
  let score = 0;
  const signals: string[] = [];

  if (hasText(input.bio)) {
    score += 12;
    signals.push("bio");
  }
  if (hasText(input.country) && hasText(input.city)) {
    score += 10;
    signals.push("location");
  }
  if (hasText(input.profileImage)) {
    score += 8;
    signals.push("profile-image");
  }
  if (hasText(input.instagram)) {
    score += 10;
    signals.push("instagram");
  }
  if (hasText(input.website)) {
    score += 10;
    signals.push("website");
  }
  if (input.hasPortfolio) {
    score += 12;
    signals.push("portfolio");
  }
  if ((input.seriesCount || 0) > 0) {
    score += Math.min((input.seriesCount || 0) * 5, 20);
    signals.push("series");
  }
  if ((input.artEventCount || 0) > 0) {
    score += Math.min((input.artEventCount || 0) * 4, 12);
    signals.push("timeline");
  }
  if ((input.exhibitionCount || 0) > 0) {
    score += Math.min((input.exhibitionCount || 0) * 4, 16);
    signals.push("exhibitions");
  }

  const normalized = Math.max(0, Math.min(100, score));
  const level: TrustLevel = normalized >= 70 ? "trusted" : normalized >= 40 ? "verified" : "basic";
  return { score: normalized, level, signals };
}
