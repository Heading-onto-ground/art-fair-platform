import { NextResponse } from "next/server";
import { listGalleryProfiles } from "@/lib/auth";
import { listOpenCalls } from "@/app/data/openCalls";
import { listExternalGalleryDirectory } from "@/lib/externalGalleryDirectory";
import { listGalleryEmailDirectory } from "@/lib/galleryEmailDirectory";
import { PORTAL_GALLERY_SEEDS } from "@/lib/portalGallerySeeds";

export const dynamic = "force-dynamic";

function normalizeCountry(input: string) {
  const v = String(input || "").trim();
  if (!v) return v;
  const compact = v.replace(/\s+/g, "").toLowerCase();
  if (compact === "대한민국" || compact === "한국" || compact === "southkorea" || compact === "republicofkorea") {
    return "한국";
  }
  return v;
}

function normalizeText(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u3131-\uD79D\u3040-\u30ff\u4e00-\u9faf\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCity(input: string) {
  const city = String(input || "").trim();
  if (!city) return city;
  const lower = city.toLowerCase();
  if (lower === "seould" || lower === "seoul d") return "Seoul";
  return city;
}

function isTokenLike(value: string) {
  const v = String(value || "").trim();
  if (!v) return false;
  if (!/^[a-z0-9]{6,}$/i.test(v)) return false;
  return /[a-z]/i.test(v) && /\d/.test(v);
}

function isLikelyInvalidInternalGalleryProfile(profile: any) {
  const nowYear = new Date().getFullYear();
  const foundedYear = Number(profile?.foundedYear || 0);
  if (foundedYear && (foundedYear < 1500 || foundedYear > nowYear + 1)) return true;

  const name = String(profile?.name || "").trim();
  const city = String(profile?.city || "").trim();
  const website = String(profile?.website || "").trim();
  const bio = String(profile?.bio || "").trim();
  const address = String(profile?.address || "").trim();
  const instagram = String(profile?.instagram || "").trim();

  if (isTokenLike(name) && !city && !website && !bio && (isTokenLike(address) || isTokenLike(instagram))) {
    return true;
  }
  return false;
}

function hostFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "";
  }
}

function unifiedGalleryKey(input: {
  name?: string;
  country?: string;
  city?: string;
  website?: string;
  email?: string;
}) {
  const ncc = `ncc:${normalizeText(input.name || "")}|${normalizeText(input.country || "")}|${normalizeText(input.city || "")}`;
  const emailHost = hostFromUrl(input.email?.includes("@") ? `https://${String(input.email).split("@")[1]}` : "");
  // Prefer matching by name/country/city + email domain first to prevent
  // duplicate internal profiles when one record lacks website.
  if (emailHost) {
    return `${ncc}|emailhost:${emailHost}`;
  }
  const host = hostFromUrl(input.website);
  if (host) return `host:${host}`;
  return ncc;
}

function profileCompletenessScore(profile: any) {
  let score = 0;
  if (String(profile?.website || "").trim()) score += 3;
  if (String(profile?.bio || "").trim()) score += 2;
  if (String(profile?.address || "").trim()) score += 1;
  if (String(profile?.instagram || "").trim()) score += 1;
  if (String(profile?.email || "").trim()) score += 1;
  if (Number(profile?.foundedYear || 0) > 0) score += 1;
  return score;
}

function finalResponseDedupeKey(profile: any) {
  const name = normalizeText(String(profile?.name || ""));
  const country = normalizeText(String(profile?.country || ""));
  const city = normalizeText(String(profile?.city || ""));
  const email = String(profile?.email || "").trim().toLowerCase();
  const host = hostFromUrl(String(profile?.website || ""));
  if (email) return `ncc+email:${name}|${country}|${city}|${email}`;
  if (host) return `ncc+host:${name}|${country}|${city}|${host}`;
  return `ncc:${name}|${country}|${city}`;
}

function isValidEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input || "").trim());
}

function inferredEmailFromWebsite(website?: string) {
  const host = hostFromUrl(website);
  if (!host || !host.includes(".")) return "";
  return `info@${host}`;
}

function matchKey(input: {
  name: string;
  country: string;
  city: string;
  website?: string;
}) {
  const host = hostFromUrl(input.website);
  if (host) return `host:${host}`;
  return `ncc:${normalizeText(input.name)}|${normalizeText(input.country)}|${normalizeText(input.city)}`;
}

function isAllowedDirectoryLocation(countryInput: string, cityInput: string) {
  const country = normalizeCountry(countryInput);
  const city = normalizeCity(cityInput).toLowerCase();
  // Current curation policy: China listings are limited to major cities.
  if (country === "중국") {
    const majorCities = [
      "shanghai",
      "beijing",
      "guangzhou",
      "shenzhen",
      "chengdu",
      "hangzhou",
      "nanjing",
      "wuhan",
      "chongqing",
      "tianjin",
      "xi'an",
      "xian",
      "suzhou",
      "qingdao",
      "xiamen",
    ];
    return majorCities.some((m) => city === m || city.startsWith(`${m} `));
  }
  return true;
}

export async function GET() {
  try {
    const [internalGalleries, openCalls, externalDirectory, emailDirectory] = await Promise.all([
      listGalleryProfiles(),
      listOpenCalls(),
      listExternalGalleryDirectory(),
      listGalleryEmailDirectory({ activeOnly: true, limit: 5000 }),
    ]);

    const emailByGalleryId = new Map<string, string>();
    const emailByHost = new Map<string, string>();
    const emailByNcc = new Map<string, string>();
    for (const row of emailDirectory) {
      const email = String(row.email || "").trim().toLowerCase();
      if (!isValidEmail(email)) continue;
      if (row.galleryId) emailByGalleryId.set(row.galleryId, email);
      const host = hostFromUrl(row.website || undefined);
      if (host && !emailByHost.has(host)) emailByHost.set(host, email);
      const ncc = `ncc:${normalizeText(row.galleryName)}|${normalizeText(row.country || "")}|${normalizeText(row.city || "")}`;
      if (!emailByNcc.has(ncc)) emailByNcc.set(ncc, email);
    }

    function resolveEmail(input: {
      explicit?: string;
      galleryId?: string;
      website?: string;
      name: string;
      country: string;
      city: string;
    }) {
      const explicit = String(input.explicit || "").trim().toLowerCase();
      if (isValidEmail(explicit)) return explicit;
      if (input.galleryId && emailByGalleryId.has(input.galleryId)) return String(emailByGalleryId.get(input.galleryId));
      const host = hostFromUrl(input.website);
      if (host && emailByHost.has(host)) return String(emailByHost.get(host));
      const ncc = `ncc:${normalizeText(input.name)}|${normalizeText(input.country)}|${normalizeText(input.city)}`;
      if (emailByNcc.has(ncc)) return String(emailByNcc.get(ncc));
      const inferred = inferredEmailFromWebsite(input.website);
      return inferred || "";
    }

    const internalIds = new Set(internalGalleries.map((g) => g.userId));
    const externalMap = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        country: string;
        city: string;
        website?: string;
        bio?: string;
        qualityScore: number;
        updatedAt: number;
      }
    >();

    // 1) Seed fallback: make portal seeds visible immediately even
    // before sync jobs populate ExternalGalleryDirectory in production.
    for (const seed of PORTAL_GALLERY_SEEDS) {
      if (!seed.galleryId || internalIds.has(seed.galleryId)) continue;
      const normalizedCountry = normalizeCountry(seed.country);
      const normalizedCity = normalizeCity(seed.city);
      if (!isAllowedDirectoryLocation(normalizedCountry, normalizedCity)) continue;
      const key = matchKey({
        name: seed.name,
        country: normalizedCountry,
        city: normalizedCity,
        website: seed.website || undefined,
      });
      externalMap.set(key, {
        userId: seed.galleryId,
        name: seed.name,
        email: resolveEmail({
          explicit: seed.externalEmail || undefined,
          galleryId: seed.galleryId,
          website: seed.website || undefined,
          name: seed.name,
          country: normalizedCountry,
          city: normalizedCity,
        }),
        country: normalizedCountry,
        city: normalizedCity,
        website: seed.website || undefined,
        bio: seed.bio || undefined,
        qualityScore: 30 + (seed.website ? 10 : 0),
        updatedAt: Date.now(),
      });
    }

    // 2) External directory (already synced/quality-scored) has priority base entries.
    for (const ext of externalDirectory) {
      if (!ext.galleryId || internalIds.has(ext.galleryId)) continue;
      const normalizedCountry = normalizeCountry(ext.country);
      const normalizedCity = normalizeCity(ext.city);
      if (!isAllowedDirectoryLocation(normalizedCountry, normalizedCity)) continue;
      const key = matchKey({
        name: ext.name,
        country: normalizedCountry,
        city: normalizedCity,
        website: ext.website || undefined,
      });
      externalMap.set(key, {
        userId: ext.galleryId,
        name: ext.name,
        email: resolveEmail({
          explicit: ext.externalEmail || undefined,
          galleryId: ext.galleryId,
          website: ext.website || undefined,
          name: ext.name,
          country: normalizedCountry,
          city: normalizedCity,
        }),
        country: normalizedCountry,
        city: normalizedCity,
        website: ext.website || undefined,
        bio: ext.bio || undefined,
        qualityScore: Number(ext.qualityScore || 0),
        updatedAt: new Date(ext.updatedAt).getTime(),
      });
    }

    // 3) External open-call derived entries refresh/complete missing data.
    for (const oc of openCalls) {
      if (!oc.isExternal) continue;
      if (!oc.galleryId || internalIds.has(oc.galleryId)) continue;
      const normalizedCountry = normalizeCountry(oc.country);
      const normalizedCity = normalizeCity(oc.city);
      if (!isAllowedDirectoryLocation(normalizedCountry, normalizedCity)) continue;
      const candidate = {
        userId: oc.galleryId,
        name: oc.gallery,
        email: resolveEmail({
          explicit: oc.externalEmail || undefined,
          galleryId: oc.galleryId,
          website: oc.galleryWebsite || undefined,
          name: oc.gallery,
          country: normalizedCountry,
          city: normalizedCity,
        }),
        country: normalizedCountry,
        city: normalizedCity,
        website: oc.galleryWebsite,
        bio: oc.galleryDescription,
        qualityScore: 45 + (oc.galleryWebsite ? 15 : 0) + (oc.externalEmail ? 10 : 0),
        updatedAt: oc.createdAt,
      };
      const key = matchKey(candidate);
      const prev = externalMap.get(key);
      if (!prev || candidate.updatedAt > prev.updatedAt) {
        externalMap.set(key, candidate);
      } else if (prev) {
        externalMap.set(key, {
          ...prev,
          website: prev.website || candidate.website,
          bio: prev.bio || candidate.bio,
          email: prev.email || candidate.email,
          qualityScore: Math.max(prev.qualityScore, candidate.qualityScore),
        });
      }
    }

    const internalNormalized = internalGalleries
      .map((g) => {
        const country = normalizeCountry((g as { country?: string }).country || "");
        const city = normalizeCity(String((g as { city?: string }).city || ""));
        const name = String((g as { name?: string }).name || "");
        const website = String((g as { website?: string }).website || "");
        const userId = String((g as { userId?: string }).userId || "");
        const explicit = String((g as { email?: string }).email || "");
        return {
          ...g,
          country,
          email: resolveEmail({ explicit, galleryId: userId, website, name, country, city }),
        };
      })
      .filter((g) => isAllowedDirectoryLocation(g.country, g.city))
      .filter((g) => !isLikelyInvalidInternalGalleryProfile(g));

    // Deduplicate internal profiles that represent the same gallery.
    const internalDedupMap = new Map<string, any>();
    const internalSorted = [...internalNormalized].sort((a: any, b: any) => {
      const scoreDiff = profileCompletenessScore(b) - profileCompletenessScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      const aUpdated = Number(new Date(a?.updatedAt || 0).getTime() || 0);
      const bUpdated = Number(new Date(b?.updatedAt || 0).getTime() || 0);
      return bUpdated - aUpdated;
    });
    for (const g of internalSorted) {
      const key = unifiedGalleryKey({
        name: (g as any).name,
        country: (g as any).country,
        city: (g as any).city,
        website: (g as any).website,
        email: (g as any).email,
      });
      if (!internalDedupMap.has(key)) {
        internalDedupMap.set(key, g as any);
      }
    }
    const internalDeduped = Array.from(internalDedupMap.values());

    const externalSorted = Array.from(externalMap.values()).sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      return a.name.localeCompare(b.name);
    });

    // Final cross-source dedupe:
    // - keep internal profiles as primary
    // - merge/fill missing fields from external candidates when keys collide
    const mergedMap = new Map<string, any>();
    for (const g of internalDeduped) {
      const key = unifiedGalleryKey({
        name: (g as any).name,
        country: (g as any).country,
        city: (g as any).city,
        website: (g as any).website,
        email: (g as any).email,
      });
      mergedMap.set(key, g as any);
    }
    for (const g of externalSorted) {
      const key = unifiedGalleryKey(g);
      const prev = mergedMap.get(key);
      if (!prev) {
        mergedMap.set(key, g as any);
        continue;
      }
      // Preserve internal identity fields while enriching empty metadata.
      mergedMap.set(key, {
        ...prev,
        website: prev.website || g.website,
        bio: prev.bio || g.bio,
        email: prev.email || g.email,
      });
    }

    const combined = Array.from(mergedMap.values());
    const finalMap = new Map<string, any>();
    const finalSorted = [...combined].sort((a: any, b: any) => {
      const scoreDiff = profileCompletenessScore(b) - profileCompletenessScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      const aUpdated = Number(new Date(a?.updatedAt || 0).getTime() || 0);
      const bUpdated = Number(new Date(b?.updatedAt || 0).getTime() || 0);
      return bUpdated - aUpdated;
    });
    for (const g of finalSorted) {
      const key = finalResponseDedupeKey(g);
      if (!finalMap.has(key)) finalMap.set(key, g);
    }
    const galleries = Array.from(finalMap.values());

    const res = NextResponse.json({ galleries }, { status: 200 });
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
    return res;
  } catch (e) {
    console.error("GET /api/public/galleries failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
