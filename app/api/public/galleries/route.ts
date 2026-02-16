import { NextResponse } from "next/server";
import { listGalleryProfiles } from "@/lib/auth";
import { listOpenCalls } from "@/app/data/openCalls";
import { listExternalGalleryDirectory } from "@/lib/externalGalleryDirectory";

export const dynamic = "force-dynamic";

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
    const [internalGalleries, openCalls, externalDirectory] = await Promise.all([
      listGalleryProfiles(),
      listOpenCalls(),
      listExternalGalleryDirectory(),
    ]);

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
        country: ext.country,
        city: ext.city,
        website: ext.website || undefined,
      });
      externalMap.set(key, {
        userId: ext.galleryId,
        name: ext.name,
        email: ext.externalEmail || "",
        country: ext.country,
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
        email: oc.externalEmail || "",
        country: oc.country,
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

    const galleries = [
      ...internalGalleries,
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
