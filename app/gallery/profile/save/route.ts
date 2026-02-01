import { NextResponse } from "next/server";
import { getServerSession, upsertGalleryProfile } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = getServerSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    if (session.role !== "gallery") {
      return NextResponse.json({ ok: false, error: "gallery only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({} as any));

    const profile = upsertGalleryProfile(session.userId, {
      email: session.email,
      name: String(body?.name ?? "").trim(),
      country: String(body?.country ?? "").trim(),
      city: String(body?.city ?? "").trim(),
      bio: String(body?.bio ?? "").trim(),
      website: body?.website ? String(body.website).trim() : undefined,
    });

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    console.error("POST /api/gallery/profile/save failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
