/**
 * GET /api/artist/public/[artistId]/ritual-summary
 *
 * Returns Artist Ritual summary for web profile display.
 * Public endpoint — no auth required. Artist must have exhibitions_public.
 *
 * Response shape: ArtistRitualSummary
 * - currentStreak: number
 * - totalRitualPosts: number
 * - recentPracticeLogs: { id, date, state, medium }[]
 *
 * Web consumption:
 *   const res = await fetch(`/api/artist/public/${artistId}/ritual-summary`);
 *   const data = await res.json();
 *   if (res.ok) {
 *     // data.currentStreak, data.totalRitualPosts, data.recentPracticeLogs
 *   }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  type ArtistRitualSummary,
  calculateStreakFromMoments,
} from "@/lib/artistRitual";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { artistId: string } }
) {
  const { artistId } = params;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id FROM "ArtistProfile" WHERE "artistId" = $1 AND "exhibitions_public" = true LIMIT 1`,
    artistId
  ).catch(() => []) as { id: string }[];

  const profile = rows[0];
  if (!profile) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const moments = await prisma.artistMoment.findMany({
    where: { artistId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, createdAt: true, state: true, medium: true, imageUrl: true },
  });

  const dateKeys = new Set(
    moments.map((m) => {
      const d = new Date(m.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })
  );

  // Count moments per day for last 90 days
  const countByDate = new Map<string, number>();
  for (const m of moments) {
    const d = new Date(m.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
  }

  const practiceGraphData: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    practiceGraphData.push({ date: key, count: countByDate.get(key) ?? 0 });
  }

  const summary: ArtistRitualSummary = {
    currentStreak: calculateStreakFromMoments(moments),
    totalRitualPosts: moments.length,
    activeDays: dateKeys.size,
    recentPracticeLogs: moments.slice(0, 5).map((m) => ({
      id: m.id,
      date: m.createdAt.toISOString(),
      state: m.state,
      medium: m.medium,
      imageUrl: m.imageUrl || null,
    })),
    practiceGraphData,
  };

  return NextResponse.json(summary);
}
