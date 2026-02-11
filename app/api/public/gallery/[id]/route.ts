import { NextResponse } from "next/server";
import { getProfileByUserId } from "@/lib/auth";
import { getExhibitionsByGalleryId } from "@/app/data/exhibitions";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);
    const profile = await getProfileByUserId(id);

    // ✅ gallery 프로필만 노출
    if (!profile || profile.role !== "gallery") {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
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
