import { NextResponse } from "next/server";
import { listGalleryProfiles } from "@/lib/auth";
import { listOpenCalls } from "@/app/data/openCalls";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [internalGalleries, openCalls] = await Promise.all([
      listGalleryProfiles(),
      listOpenCalls(),
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
        updatedAt: number;
      }
    >();

    for (const oc of openCalls) {
      if (!oc.isExternal) continue;
      if (!oc.galleryId || internalIds.has(oc.galleryId)) continue;
      const prev = externalMap.get(oc.galleryId);
      const candidate = {
        userId: oc.galleryId,
        name: oc.gallery,
        email: oc.externalEmail || "",
        country: oc.country,
        city: oc.city,
        website: oc.galleryWebsite,
        bio: oc.galleryDescription,
        updatedAt: oc.createdAt,
      };
      if (!prev || candidate.updatedAt > prev.updatedAt) {
        externalMap.set(oc.galleryId, candidate);
      }
    }

    const galleries = [
      ...internalGalleries,
      ...Array.from(externalMap.values()),
    ];

    const res = NextResponse.json({ galleries }, { status: 200 });
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
    return res;
  } catch (e) {
    console.error("GET /api/public/galleries failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
