import { NextResponse } from "next/server";
import { getServerSession, upsertArtistProfile, upsertGalleryProfile } from "@/lib/auth";
import { validateProfileImageInput } from "@/lib/profileImageValidation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (body.image === undefined || body.image === null || body.image === "") {
      return NextResponse.json({ ok: false, error: "image data required" }, { status: 400 });
    }

    const imageCheck = validateProfileImageInput(body.image);
    if (!imageCheck.ok) {
      return NextResponse.json({ ok: false, error: imageCheck.error }, { status: 400 });
    }

    const profile =
      session.role === "artist"
        ? await upsertArtistProfile(session.userId, { profileImage: imageCheck.value })
        : await upsertGalleryProfile(session.userId, { profileImage: imageCheck.value });

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/image failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
