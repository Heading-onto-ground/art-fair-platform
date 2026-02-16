import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import {
  getPortalGallerySourcesPath,
  loadPortalGallerySources,
  savePortalGallerySources,
} from "@/lib/portalGallerySourcesStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const loaded = await loadPortalGallerySources();
    return NextResponse.json({
      ok: true,
      source: loaded.source,
      path: getPortalGallerySourcesPath(),
      count: loaded.sources.length,
      sources: loaded.sources,
    });
  } catch (e) {
    console.error("GET /api/admin/gallery-sources failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const next = body?.sources;
    const saved = await savePortalGallerySources(next);
    return NextResponse.json({ ok: true, count: saved.length });
  } catch (e: any) {
    const msg = String(e?.message || "server error");
    if (msg.includes("No valid source entries")) {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
    console.error("PUT /api/admin/gallery-sources failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

