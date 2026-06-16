import { NextResponse } from "next/server";
import { getServerSession, upsertArtistProfile, upsertGalleryProfile } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const bio = String(body.bio ?? "").trim();

    const profile =
      session.role === "artist"
        ? await upsertArtistProfile(session.userId, { bio: bio || null } as Parameters<typeof upsertArtistProfile>[1])
        : session.role === "gallery"
          ? await upsertGalleryProfile(session.userId, { bio: bio || undefined })
          : null;

    if (!profile) {
      return NextResponse.json({ ok: false, error: "unsupported role" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/bio failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
