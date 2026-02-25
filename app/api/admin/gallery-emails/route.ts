import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { sendBatchOutreach } from "@/lib/outreach";
import {
  deletePlaceholderGalleryEmails,
  getGalleryEmailDirectoryStats,
  listGalleryEmailDirectory,
  syncGalleryEmailDirectory,
} from "@/lib/galleryEmailDirectory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeLanguage(input: string): "en" | "ko" | "ja" | "fr" | "de" | "it" | "zh" {
  const v = String(input || "").toLowerCase().trim();
  if (v === "ko" || v === "ja" || v === "fr" || v === "de" || v === "it" || v === "zh") return v;
  return "en";
}

export async function GET(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const country = String(url.searchParams.get("country") || "").trim() || undefined;
    const limit = Number(url.searchParams.get("limit") || "300");

    const [rows, stats] = await Promise.all([
      listGalleryEmailDirectory({ country, activeOnly: true, limit: Number.isFinite(limit) ? limit : 300 }),
      getGalleryEmailDirectoryStats(),
    ]);
    return NextResponse.json({ ok: true, rows, stats });
  } catch (e) {
    console.error("GET /api/admin/gallery-emails failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();

    if (action === "sync") {
      const result = await syncGalleryEmailDirectory();
      const stats = await getGalleryEmailDirectoryStats();
      return NextResponse.json({ ok: true, ...result, stats });
    }

    if (action === "cleanup_placeholders") {
      const result = await deletePlaceholderGalleryEmails();
      const stats = await getGalleryEmailDirectoryStats();
      return NextResponse.json({ ok: true, ...result, stats });
    }

    if (action === "send_batch") {
      const country = String(body?.country || "ALL").trim();
      const limitRaw = Number(body?.limit || 200);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(1000, limitRaw)) : 200;

      const rows = await listGalleryEmailDirectory({
        country: country === "ALL" ? undefined : country,
        activeOnly: true,
        limit,
      });

      if (!rows.length) {
        return NextResponse.json({ ok: false, error: "No active gallery emails found" }, { status: 400 });
      }

      const targets = rows.map((r) => ({
        to: r.email,
        galleryName: r.galleryName,
        country: r.country || "Unknown",
        language: normalizeLanguage(r.language),
      }));
      const result = await sendBatchOutreach(targets);
      return NextResponse.json({
        ok: true,
        requested: targets.length,
        sent: result.sent,
        failed: result.failed,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/admin/gallery-emails failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String).filter(Boolean) : [];
    if (!ids.length) return NextResponse.json({ ok: false, error: "ids required" }, { status: 400 });
    const { prisma } = await import("@/lib/prisma");
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "GalleryEmailDirectory" WHERE id = ANY($1::text[])`,
      ids
    );
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    console.error("DELETE /api/admin/gallery-emails failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

