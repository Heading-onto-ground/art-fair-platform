// Artist-OpenCall matching algorithm
// Matches based on genre/theme similarity, country proximity, and deadline urgency

import type { OpenCall } from "@/app/data/openCalls";

export type ArtistProfile = {
  userId: string;
  name: string;
  genre: string;
  country: string;
  city: string;
};

export type MatchedOpenCall = OpenCall & {
  matchScore: number;
  matchReasons: string[];
};

// Genre keywords that indicate compatibility
const GENRE_KEYWORDS: Record<string, string[]> = {
  painting: ["painting", "canvas", "oil", "acrylic", "watercolor", "body", "感覚", "wine"],
  sculpture: ["sculpture", "installation", "3d", "object", "chair", "vanishing"],
  digital: ["digital", "new media", "technology", "ai", "virtual", "horizons", "ecosystem"],
  photography: ["photography", "photo", "image", "visual", "light", "nocturne"],
  mixed: ["mixed media", "multimedia", "interdisciplinary", "collective", "practice"],
  performance: ["performance", "body", "live", "action", "durational"],
  video: ["video", "film", "moving image", "screen"],
  printmaking: ["print", "printmaking", "engraving", "lithography"],
  ceramics: ["ceramics", "pottery", "clay", "craft"],
  textile: ["textile", "fiber", "fabric", "weaving"],
};

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function genreMatchScore(artistGenre: string, openCallTheme: string): number {
  const genre = normalizeText(artistGenre);
  const theme = normalizeText(openCallTheme);

  // Direct match
  if (theme.includes(genre)) return 1.0;

  // Keyword matching
  for (const [category, keywords] of Object.entries(GENRE_KEYWORDS)) {
    const artistMatches = keywords.some((k) => genre.includes(k)) || genre.includes(category);
    const themeMatches = keywords.some((k) => theme.includes(k));
    if (artistMatches && themeMatches) return 0.8;
  }

  // Partial keyword overlap
  const genreWords = genre.split(/[\s,/]+/);
  const themeWords = theme.split(/[\s,/—–-]+/);
  const overlap = genreWords.filter((w) => w.length > 2 && themeWords.some((tw) => tw.includes(w) || w.includes(tw)));
  if (overlap.length > 0) return 0.5;

  // All open calls have some universal appeal
  return 0.1;
}

function countryMatchScore(artistCountry: string, openCallCountry: string): number {
  if (artistCountry === openCallCountry) return 1.0;

  // Same continent bonus
  const asianCountries = ["한국", "일본", "중국"];
  const europeanCountries = ["영국", "프랑스", "독일", "이탈리아", "스위스"];

  if (asianCountries.includes(artistCountry) && asianCountries.includes(openCallCountry)) return 0.6;
  if (europeanCountries.includes(artistCountry) && europeanCountries.includes(openCallCountry)) return 0.6;

  // International open calls are valuable
  return 0.3;
}

function deadlineUrgencyScore(deadline: string): number {
  const now = Date.now();
  const deadlineDate = new Date(deadline).getTime();
  const daysLeft = (deadlineDate - now) / (1000 * 60 * 60 * 24);

  if (daysLeft < 0) return 0; // Expired
  if (daysLeft <= 7) return 1.0; // Very urgent
  if (daysLeft <= 14) return 0.9;
  if (daysLeft <= 30) return 0.7;
  if (daysLeft <= 60) return 0.5;
  return 0.3;
}

export function matchArtistToOpenCalls(
  artist: ArtistProfile,
  openCalls: OpenCall[],
  appliedIds: Set<string> = new Set()
): MatchedOpenCall[] {
  const now = Date.now();

  return openCalls
    .filter((oc) => {
      // Filter out expired and already applied
      const deadlineDate = new Date(oc.deadline).getTime();
      return deadlineDate > now && !appliedIds.has(oc.id);
    })
    .map((oc) => {
      const genreScore = genreMatchScore(artist.genre, oc.theme);
      const countryScore = countryMatchScore(artist.country, oc.country);
      const urgencyScore = deadlineUrgencyScore(oc.deadline);

      // Weighted composite score
      const matchScore = genreScore * 0.45 + countryScore * 0.30 + urgencyScore * 0.25;

      const reasons: string[] = [];
      if (genreScore >= 0.8) reasons.push("Theme matches your genre");
      if (genreScore >= 0.5 && genreScore < 0.8) reasons.push("Related theme");
      if (countryScore >= 1.0) reasons.push("In your country");
      if (countryScore >= 0.6 && countryScore < 1.0) reasons.push("Nearby region");
      if (countryScore < 0.6) reasons.push("International opportunity");
      if (urgencyScore >= 0.9) reasons.push("Deadline approaching");
      if (oc.isExternal) reasons.push("Global institution");

      return { ...oc, matchScore, matchReasons: reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function getTopRecommendations(
  artist: ArtistProfile,
  openCalls: OpenCall[],
  appliedIds: Set<string> = new Set(),
  limit: number = 5
): MatchedOpenCall[] {
  return matchArtistToOpenCalls(artist, openCalls, appliedIds).slice(0, limit);
}

// Get open calls with deadlines approaching (within N days)
export function getDeadlineApproaching(openCalls: OpenCall[], withinDays: number = 7): OpenCall[] {
  const now = Date.now();
  const cutoff = now + withinDays * 24 * 60 * 60 * 1000;

  return openCalls
    .filter((oc) => {
      const d = new Date(oc.deadline).getTime();
      return d > now && d <= cutoff;
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}
