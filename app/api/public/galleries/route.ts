import { NextResponse } from "next/server";
import { listGalleryProfiles } from "@/lib/auth";
import { listOpenCalls } from "@/app/data/openCalls";
import { listExternalGalleryDirectory } from "@/lib/externalGalleryDirectory";
import { listGalleryEmailDirectory } from "@/lib/galleryEmailDirectory";

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

function hostFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "";
  }
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

    // 1) External directory (portal-seeded) has priority base entries.
    for (const ext of externalDirectory) {
      if (!ext.galleryId || internalIds.has(ext.galleryId)) continue;
      const key = matchKey({
        name: ext.name,
        country: normalizeCountry(ext.country),
        city: ext.city,
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
          country: normalizeCountry(ext.country),
          city: ext.city,
        }),
        country: normalizeCountry(ext.country),
        city: ext.city,
        website: ext.website || undefined,
        bio: ext.bio || undefined,
        qualityScore: Number(ext.qualityScore || 0),
        updatedAt: new Date(ext.updatedAt).getTime(),
      });
    }

    // 2) External open-call derived entries refresh/complete missing data.
    for (const oc of openCalls) {
      if (!oc.isExternal) continue;
      if (!oc.galleryId || internalIds.has(oc.galleryId)) continue;
      const candidate = {
        userId: oc.galleryId,
        name: oc.gallery,
        email: resolveEmail({
          explicit: oc.externalEmail || undefined,
          galleryId: oc.galleryId,
          website: oc.galleryWebsite || undefined,
          name: oc.gallery,
          country: normalizeCountry(oc.country),
          city: oc.city,
        }),
        country: normalizeCountry(oc.country),
        city: oc.city,
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

    const internalNormalized = internalGalleries.map((g) => {
      const country = normalizeCountry((g as { country?: string }).country || "");
      const city = String((g as { city?: string }).city || "");
      const name = String((g as { name?: string }).name || "");
      const website = String((g as { website?: string }).website || "");
      const userId = String((g as { userId?: string }).userId || "");
      const explicit = String((g as { email?: string }).email || "");
      return {
        ...g,
        country,
        email: resolveEmail({ explicit, galleryId: userId, website, name, country, city }),
      };
    });

    const galleries = [
      ...internalNormalized,
      ...Array.from(externalMap.values()).sort((a, b) => {
        if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
        if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
        return a.name.localeCompare(b.name);
      }),
    ];

    const res = NextResponse.json({ galleries }, { status: 200 });
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
    return res;
  } catch (e) {
    console.error("GET /api/public/galleries failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
