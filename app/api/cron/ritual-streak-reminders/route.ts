export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCronAuthorized } from "@/lib/cronAuth";
import { calculateStreakFromMoments } from "@/lib/artistRitual";
import { createNotification } from "@/app/data/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily reminder for artists whose practice streak is at risk:
 * they recorded a moment yesterday (streak >= 2) but not yet today.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Artists who recorded a moment yesterday.
    const yesterdayMoments = await prisma.artistMoment.findMany({
      where: { createdAt: { gte: startOfYesterday, lt: startOfToday } },
      select: { userId: true, artistId: true },
      distinct: ["userId"],
      take: 500,
    });

    let notified = 0;
    let skipped = 0;

    for (const m of yesterdayMoments as { userId: string; artistId: string }[]) {
      // Already posted today? No reminder needed.
      const todayCount = await prisma.artistMoment.count({
        where: { artistId: m.artistId, createdAt: { gte: startOfToday } },
      });
      if (todayCount > 0) {
        skipped++;
        continue;
      }

      const recent = await prisma.artistMoment.findMany({
        where: { artistId: m.artistId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { createdAt: true },
      });
      const streak = calculateStreakFromMoments(recent);
      if (streak < 2) {
        skipped++;
        continue;
      }

      // Avoid duplicate reminders within the same day.
      const alreadyReminded = await prisma.notification.count({
        where: { userId: m.userId, type: "ritual_reminder", createdAt: { gte: startOfToday } },
      });
      if (alreadyReminded > 0) {
        skipped++;
        continue;
      }

      await createNotification({
        userId: m.userId,
        type: "ritual_reminder",
        title: "연속 기록을 이어가세요",
        message: `현재 ${streak}일 연속 기록 중이에요. 오늘 작업을 기록하지 않으면 연속 기록이 끊깁니다.`,
        link: "/artist/ritual",
      });
      notified++;
    }

    return NextResponse.json({ ok: true, candidates: yesterdayMoments.length, notified, skipped });
  } catch (e) {
    console.error("GET /api/cron/ritual-streak-reminders failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
