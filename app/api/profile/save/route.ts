import { NextResponse } from "next/server";
import { getServerSession, upsertArtistProfile, upsertGalleryProfile } from "@/lib/auth";
import { validateProfileImageInput } from "@/lib/profileImageValidation";

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    let profileImage: string | null | undefined;
    if (body.profileImage !== undefined) {
      const imageCheck = validateProfileImageInput(body.profileImage);
      if (!imageCheck.ok) {
        return NextResponse.json({ ok: false, error: imageCheck.error }, { status: 400 });
      }
      profileImage = imageCheck.value;
    }

    const base = {
      name: String(body.name ?? "").trim(),
      country: String(body.country ?? "").trim(),
      city: String(body.city ?? "").trim(),
      bio: String(body.bio ?? "").trim(),
      website: body.website ? String(body.website).trim() : undefined,
      instagram: body.instagram ? String(body.instagram).trim() : undefined,
    };

    const profile =
      session.role === "artist"
        ? await upsertArtistProfile(session.userId, {
            ...base,
            artistId: body.artistId ? String(body.artistId).trim() : undefined,
            startedYear: body.startedYear ? Number(body.startedYear) : undefined,
            genre: body.genre ? String(body.genre).trim() : undefined,
            portfolioUrl: body.portfolioUrl ? String(body.portfolioUrl).trim() : undefined,
            profileImage,
            workNote: body.workNote !== undefined ? (body.workNote ? String(body.workNote).trim() : null) : undefined,
          } as any)
        : await upsertGalleryProfile(session.userId, {
            ...base,
            galleryId: body.galleryId ? String(body.galleryId).trim() : undefined,
            address: body.address ? String(body.address).trim() : undefined,
            foundedYear: body.foundedYear ? Number(body.foundedYear) : undefined,
            profileImage,
          });

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/save failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
