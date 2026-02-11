import { NextResponse } from "next/server";
import { getServerSession, upsertArtistProfile, upsertGalleryProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Max image size: 800KB base64 (roughly 600KB original)
const MAX_SIZE = 800 * 1024;

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { image } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json({ ok: false, error: "image data required" }, { status: 400 });
    }

    // Validate it's a data URI
    if (!image.startsWith("data:image/")) {
      return NextResponse.json({ ok: false, error: "invalid image format" }, { status: 400 });
    }

    // Check size
    if (image.length > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "Image too large. Please use a smaller image (max ~500KB)." }, { status: 400 });
    }

    // Save to profile
    const profile =
      session.role === "artist"
        ? await upsertArtistProfile(session.userId, { profileImage: image })
        : await upsertGalleryProfile(session.userId, { profileImage: image });

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/image failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
