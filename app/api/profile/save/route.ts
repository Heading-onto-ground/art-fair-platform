import { NextResponse } from "next/server";
import { getServerSession, upsertArtistProfile, upsertGalleryProfile } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const base = {
      name: String(body.name ?? "").trim(),
      country: String(body.country ?? "").trim(),
      city: String(body.city ?? "").trim(),
      bio: String(body.bio ?? "").trim(),
      website: body.website ? String(body.website).trim() : undefined,
      instagram: body.instagram ? String(body.instagram).trim() : undefined,
    };

    // role별로 분기
    const profile =
      session.role === "artist"
        ? await upsertArtistProfile(session.userId, {
            ...base,
            artistId: body.artistId ? String(body.artistId).trim() : undefined,
            startedYear: body.startedYear ? Number(body.startedYear) : undefined,
            genre: body.genre ? String(body.genre).trim() : undefined,
            portfolioUrl: body.portfolioUrl ? String(body.portfolioUrl).trim() : undefined,
          })
        : await upsertGalleryProfile(session.userId, {
            ...base,
            galleryId: body.galleryId ? String(body.galleryId).trim() : undefined,
            address: body.address ? String(body.address).trim() : undefined,
            foundedYear: body.foundedYear ? Number(body.foundedYear) : undefined,
          });

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/save failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
