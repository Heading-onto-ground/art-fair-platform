import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  getExhibitionsByGalleryId,
  updateExhibition,
  deleteExhibition,
} from "@/app/data/exhibitions";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "gallery") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const current = getExhibitionsByGalleryId(session.userId).find(
      (e) => e.id === params.id
    );
    if (!current) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const payload = {
      title: body?.title ? String(body.title).trim() : undefined,
      country: body?.country ? String(body.country).trim() : undefined,
      city: body?.city ? String(body.city).trim() : undefined,
      year: body?.year ? Number(body.year) : undefined,
      summary: body?.summary ? String(body.summary).trim() : undefined,
    };

    const updated = updateExhibition(params.id, payload);
    return NextResponse.json({ exhibition: updated }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/gallery/exhibitions/[id] failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "gallery") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const current = getExhibitionsByGalleryId(session.userId).find(
      (e) => e.id === params.id
    );
    if (!current) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    deleteExhibition(params.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/gallery/exhibitions/[id] failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
