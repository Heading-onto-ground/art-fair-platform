import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getOpenCallById, updateOpenCallPoster } from "@/app/data/openCalls";

export const dynamic = "force-dynamic";

const MAX_SIZE = 1500 * 1024; // ~1.5MB base64

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "gallery") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const openCall = await getOpenCallById(params.id);
    if (!openCall) {
      return NextResponse.json({ ok: false, error: "open call not found" }, { status: 404 });
    }

    // Only allow the gallery that created the open call (or admin)
    if (openCall.galleryId !== session.userId) {
      return NextResponse.json({ ok: false, error: "not your open call" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { image } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json({ ok: false, error: "image data required" }, { status: 400 });
    }

    if (!image.startsWith("data:image/")) {
      return NextResponse.json({ ok: false, error: "invalid image format" }, { status: 400 });
    }

    if (image.length > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "Image too large (max ~500KB)" }, { status: 400 });
    }

    const updated = await updateOpenCallPoster(params.id, image);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, openCall: updated }, { status: 200 });
  } catch (e) {
    console.error("POST /api/open-calls/[id]/poster failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
