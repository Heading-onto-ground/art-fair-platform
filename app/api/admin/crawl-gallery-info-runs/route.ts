export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const admin = getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") || "14")));

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, started_at, finished_at, status,
              processed, updated, skipped, errors,
              error_sample, duration_ms
       FROM crawl_gallery_info_runs
       WHERE started_at > now() - ($1 || ' days')::interval
       ORDER BY started_at DESC
       LIMIT 200`,
      String(days)
    );
    return NextResponse.json({ ok: true, runs: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: true, runs: [] });
  }
}
