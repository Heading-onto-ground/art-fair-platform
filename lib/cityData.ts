import { prisma } from "@/lib/prisma";

export type CityOpenCall = {
  id: string;
  gallery: string;
  theme: string;
  country: string;
  deadline: string;
};
export type CityGallery = { userId: string; name: string; country: string | null };
export type CityArtist = {
  userId: string;
  name: string;
  genre: string | null;
  country: string | null;
};
export type CityExhibition = { id: string; title: string; country: string | null };

export type CityContent = {
  slug: string;
  displayName: string;
  country: string | null;
  openCalls: CityOpenCall[];
  galleries: CityGallery[];
  artists: CityArtist[];
  exhibitions: CityExhibition[];
  total: number;
};

/** Normalizes a free-text city name into a URL slug. Keeps Hangul. */
export function citySlug(city: string): string {
  return String(city || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickDisplayName(variants: string[]): string {
  // Prefer a properly capitalized variant over all-lowercase free text.
  const sorted = [...variants].sort((a, b) => {
    const aCap = /^[A-Z가-힣]/.test(a) ? 1 : 0;
    const bCap = /^[A-Z가-힣]/.test(b) ? 1 : 0;
    if (aCap !== bCap) return bCap - aCap;
    return b.length - a.length;
  });
  return sorted[0];
}

type CityAccumulator = { variants: Set<string>; country: string | null; count: number };

async function collectCities(): Promise<Map<string, CityAccumulator>> {
  const map = new Map<string, CityAccumulator>();
  const add = (city?: string | null, country?: string | null) => {
    const name = String(city || "").trim();
    if (!name) return;
    const slug = citySlug(name);
    if (!slug) return;
    const entry = map.get(slug) || { variants: new Set<string>(), country: null, count: 0 };
    entry.variants.add(name);
    if (!entry.country && country) entry.country = country;
    entry.count += 1;
    map.set(slug, entry);
  };

  const [openCalls, galleries, artists, exhibitions] = await Promise.all([
    prisma.openCall.findMany({ select: { city: true, country: true } }).catch(() => []),
    prisma.galleryProfile.findMany({ select: { city: true, country: true } }).catch(() => []),
    prisma.artistProfile.findMany({ select: { city: true, country: true } }).catch(() => []),
    prisma.exhibition
      .findMany({ where: { isPublic: true }, select: { city: true, country: true } })
      .catch(() => []),
  ]);

  for (const r of openCalls) add(r.city, r.country);
  for (const r of galleries) add(r.city, r.country);
  for (const r of artists) add(r.city, r.country);
  for (const r of exhibitions) add(r.city, r.country);

  return map;
}

/** Returns city slugs that have enough content to warrant an indexable page. */
export async function listCitiesWithContent(minItems = 2): Promise<
  { slug: string; displayName: string; count: number }[]
> {
  const map = await collectCities();
  const out: { slug: string; displayName: string; count: number }[] = [];
  for (const [slug, entry] of map) {
    if (entry.count < minItems) continue;
    out.push({ slug, displayName: pickDisplayName([...entry.variants]), count: entry.count });
  }
  return out.sort((a, b) => b.count - a.count);
}

export async function getCityContent(slug: string): Promise<CityContent | null> {
  const normalized = citySlug(slug);
  if (!normalized) return null;

  const map = await collectCities();
  const entry = map.get(normalized);
  if (!entry) return null;

  const variants = [...entry.variants];
  const where = { city: { in: variants } };

  const [openCallsRaw, galleriesRaw, artistsRaw, exhibitionsRaw] = await Promise.all([
    prisma.openCall
      .findMany({
        where,
        select: { id: true, gallery: true, theme: true, country: true, deadline: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      .catch(() => []),
    prisma.galleryProfile
      .findMany({
        where,
        select: { userId: true, name: true, country: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })
      .catch(() => []),
    prisma.artistProfile
      .findMany({
        where,
        select: { userId: true, name: true, genre: true, country: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })
      .catch(() => []),
    prisma.exhibition
      .findMany({
        where: { ...where, isPublic: true },
        select: { id: true, title: true, country: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })
      .catch(() => []),
  ]);

  const total =
    openCallsRaw.length + galleriesRaw.length + artistsRaw.length + exhibitionsRaw.length;
  if (total === 0) return null;

  return {
    slug: normalized,
    displayName: pickDisplayName(variants),
    country: entry.country,
    openCalls: openCallsRaw,
    galleries: galleriesRaw,
    artists: artistsRaw,
    exhibitions: exhibitionsRaw,
    total,
  };
}
