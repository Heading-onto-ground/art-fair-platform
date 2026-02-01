import { NextResponse } from "next/server";
import { getProfileByUserId } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id);

    const profile = await getProfileByUserId(id);

    // ✅ artist 프로필만 공개
    if (!profile || profile.role !== "artist") {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    console.error("GET /api/public/artist/[id] failed:", e);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}
