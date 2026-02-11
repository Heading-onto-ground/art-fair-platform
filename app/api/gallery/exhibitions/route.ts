import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  addExhibition,
  getExhibitionsByGalleryId,
} from "@/app/data/exhibitions";

export async function GET() {
  try {
    const session = getServerSession();
    if (!session || session.role !== "gallery") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const exhibitions = await getExhibitionsByGalleryId(session.userId);
    return NextResponse.json({ exhibitions }, { status: 200 });
  } catch (e) {
    console.error("GET /api/gallery/exhibitions failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "gallery") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title ?? "").trim();
    const country = String(body?.country ?? "").trim();
    const city = String(body?.city ?? "").trim();
    const year = Number(body?.year ?? 0);
    const summary = body?.summary ? String(body.summary).trim() : undefined;

    if (!title || !country || !city || !year) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const created = await addExhibition({
      galleryId: session.userId,
      title,
      country,
      city,
      year,
      summary,
    });

    return NextResponse.json({ exhibition: created }, { status: 201 });
  } catch (e) {
    console.error("POST /api/gallery/exhibitions failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
