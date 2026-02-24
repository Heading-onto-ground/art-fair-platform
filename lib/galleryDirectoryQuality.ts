export type RawDirectoryGallery = {
  galleryId?: string;
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  sourcePortal?: string;
  sourceUrl?: string;
  externalEmail?: string;
  instagram?: string;
  foundedYear?: number;
  spaceSize?: string;
};

export type CanonicalDirectoryGallery = {
  galleryId: string;
  matchKey: string;
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  sourcePortals: string[];
  sourceUrl?: string;
  externalEmail?: string;
  qualityScore: number;
  instagram?: string;
  foundedYear?: number;
  spaceSize?: string;
};

function normalizeText(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u3131-\uD79D\u3040-\u30ff\u4e00-\u9faf\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSlug(input: string) {
  return normalizeText(input).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function hostnameFromUrl(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "";
  }
}

function buildMatchKey(input: RawDirectoryGallery) {
  const host = hostnameFromUrl(input.website || input.sourceUrl);
  const country = normalizeText(input.country);
  const city = normalizeText(input.city);
  const name = normalizeText(input.name);
  if (host) return `hostncc:${host}|${name}|${country}|${city}`;
  return `ncc:${name}|${country}|${city}`;
}

function computeQualityScore(input: {
  hasWebsite: boolean;
  hasEmail: boolean;
  hasBio: boolean;
  sourcePortals: string[];
}) {
  let score = 40;
  if (input.hasWebsite) score += 25;
  if (input.hasEmail) score += 10;
  if (input.hasBio) score += 10;
  score += Math.min(15, input.sourcePortals.length * 5);
  return score;
}

export function canonicalizeDirectoryGalleries(
  rows: RawDirectoryGallery[]
): CanonicalDirectoryGallery[] {
  const map = new Map<string, CanonicalDirectoryGallery>();

  for (const row of rows) {
    const name = String(row.name || "").trim();
    const country = String(row.country || "").trim();
    const city = String(row.city || "").trim();
    if (!name || !country || !city) continue;

    const matchKey = buildMatchKey(row);
    const portal = String(row.sourcePortal || "").trim();
    const prev = map.get(matchKey);

    if (!prev) {
      const sourcePortals = portal ? [portal] : [];
      const website = row.website?.trim() || undefined;
      const sourceUrl = row.sourceUrl?.trim() || undefined;
      const idBase = row.galleryId?.trim()
        ? row.galleryId.trim()
        : `__ext_dir_${toSlug(`${name}_${country}_${city}`)}`;
      map.set(matchKey, {
        galleryId: idBase,
        matchKey,
        name,
        country,
        city,
        website,
        bio: row.bio?.trim() || undefined,
        sourcePortals,
        sourceUrl,
        externalEmail: row.externalEmail?.trim() || undefined,
        qualityScore: computeQualityScore({
          hasWebsite: !!website,
          hasEmail: !!row.externalEmail,
          hasBio: !!row.bio,
          sourcePortals,
        }),
        instagram: row.instagram?.trim() || undefined,
        foundedYear: row.foundedYear,
        spaceSize: row.spaceSize?.trim() || undefined,
      });
      continue;
    }

    const mergedPortals = portal
      ? Array.from(new Set([...prev.sourcePortals, portal]))
      : prev.sourcePortals;
    const website = prev.website || row.website?.trim() || undefined;
    const bio = prev.bio || row.bio?.trim() || undefined;
    const sourceUrl = prev.sourceUrl || row.sourceUrl?.trim() || undefined;
    const externalEmail = prev.externalEmail || row.externalEmail?.trim() || undefined;
    const instagram = prev.instagram || row.instagram?.trim() || undefined;
    const foundedYear = prev.foundedYear ?? row.foundedYear;
    const spaceSize = prev.spaceSize || row.spaceSize?.trim() || undefined;

    const merged: CanonicalDirectoryGallery = {
      ...prev,
      website,
      bio,
      sourceUrl,
      externalEmail,
      instagram,
      foundedYear,
      spaceSize,
      sourcePortals: mergedPortals,
      qualityScore: computeQualityScore({
        hasWebsite: !!website,
        hasEmail: !!externalEmail,
        hasBio: !!bio,
        sourcePortals: mergedPortals,
      }),
    };
    map.set(matchKey, merged);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    if (a.city !== b.city) return a.city.localeCompare(b.city);
    return a.name.localeCompare(b.name);
  });
}

