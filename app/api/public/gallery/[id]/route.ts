import { NextResponse } from "next/server";
import { getProfileByUserId } from "@/lib/auth";
import { getExhibitionsByGalleryId } from "@/app/data/exhibitions";
import { listOpenCalls } from "@/app/data/openCalls";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);
    const profile = await getProfileByUserId(id);

    // ✅ gallery 프로필만 노출
    if (!profile || profile.role !== "gallery") {
      // Fallback: external gallery from crawled open calls
      const openCalls = await listOpenCalls();
      const externalCalls = openCalls.filter(
        (oc) => oc.isExternal && oc.galleryId === id
      );
      if (externalCalls.length === 0) {
        return NextResponse.json(
          { ok: false, error: "not found" },
          { status: 404 }
        );
      }
      const latest = externalCalls.sort((a, b) => b.createdAt - a.createdAt)[0];
      const pseudoProfile = {
        id: `external-${id}`,
        userId: id,
        role: "gallery" as const,
        email: latest.externalEmail || "",
        name: latest.gallery,
        country: latest.country,
        city: latest.city,
        website: latest.galleryWebsite,
        bio: latest.galleryDescription,
        createdAt: latest.createdAt,
        updatedAt: latest.createdAt,
      };
      return NextResponse.json(
        { ok: true, profile: pseudoProfile, exhibitions: [] },
        { status: 200 }
      );
    }

    const exhibitions = await getExhibitionsByGalleryId(profile.userId);

    return NextResponse.json({ ok: true, profile, exhibitions }, { status: 200 });
  } catch (e) {
    console.error("GET /api/public/gallery/[id] failed:", e);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
