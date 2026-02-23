import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getPinnedOpenCallGalleryId, setPinnedOpenCallGalleryId } from "@/lib/adminSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const pinnedGalleryId = await getPinnedOpenCallGalleryId();
  return NextResponse.json({ pinnedGalleryId }, { status: 200 });
}

export async function POST(req: Request) {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const galleryId = typeof body?.galleryId === "string" ? body.galleryId : null;
  await setPinnedOpenCallGalleryId(galleryId);
  const pinnedGalleryId = await getPinnedOpenCallGalleryId();
  return NextResponse.json({ ok: true, pinnedGalleryId }, { status: 200 });
}

