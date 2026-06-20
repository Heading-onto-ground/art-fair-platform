import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStreakFromMoments } from "@/lib/artistRitual";

export const dynamic = "force-dynamic";

/** GET — ritual summary (streak / total / postedToday) for the logged-in artist. */
export async function GET() {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const profile = await prisma.artistProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ streak: 0, totalMoments: 0, postedToday: false });
    }

    const moments = await prisma.artistMoment.findMany({
      where: { artistId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { createdAt: true },
    });

    const streak = calculateStreakFromMoments(moments);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const postedToday = moments.some((m: { createdAt: Date }) => m.createdAt >= startOfToday);

    return NextResponse.json({
      streak,
      totalMoments: moments.length,
      postedToday,
    });
  } catch (e) {
    console.error("GET /api/artist/ritual failed:", e);
    return NextResponse.json({ streak: 0, totalMoments: 0, postedToday: false });
  }
}
