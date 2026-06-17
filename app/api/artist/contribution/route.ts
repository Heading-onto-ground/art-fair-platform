import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStreakFromMoments } from "@/lib/artistRitual";
import {
  buildProfileCompletionData,
  computeContributionPoints,
} from "@/lib/contributionPoints";

export const dynamic = "force-dynamic";

/** GET — contribution points breakdown for authenticated artist */
export async function GET() {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const profile = await prisma.artistProfile.findUnique({
      where: { userId: session.userId },
      select: {
        id: true,
        name: true,
        genre: true,
        country: true,
        city: true,
        bio: true,
        instagram: true,
        website: true,
        portfolioUrl: true,
        profileImage: true,
        workNote: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "profile not found" }, { status: 404 });
    }

    const [seriesCount, artEvents, selfExhibitionCount, artworkCount] = await Promise.all([
      prisma.artworkSeries.count({ where: { artistId: profile.id } }),
      prisma.artEvent.findMany({
        where: { artistId: profile.id },
        select: { eventType: true, title: true },
      }),
      prisma.exhibition.count({ where: { createdBy: profile.id } }),
      prisma.artwork.count({ where: { artistId: profile.id } }),
    ]);

    let ritualMomentCount = 0;
    let ritualStreak = 0;
    try {
      const [momentCount, momentsForStreak] = await Promise.all([
        prisma.artistMoment.count({ where: { artistId: profile.id } }),
        prisma.artistMoment.findMany({
          where: { artistId: profile.id },
          orderBy: { createdAt: "desc" },
          take: 500,
          select: { createdAt: true },
        }),
      ]);
      ritualMomentCount = momentCount;
      ritualStreak = calculateStreakFromMoments(momentsForStreak);
    } catch (err) {
      console.error("GET /api/artist/contribution artistMoment:", err);
    }

    const profileData = buildProfileCompletionData(profile, {
      seriesCount,
      artEventCount: artEvents.length,
    });

    const contribution = computeContributionPoints({
      profile: profileData,
      seriesCount,
      artEvents: artEvents.map((e: { eventType: string; title: string }) => ({
        eventType: e.eventType,
        title: e.title,
      })),
      selfExhibitionCount,
      ritualMomentCount,
      ritualStreak,
      artworkCount,
    });

    return NextResponse.json({ contribution });
  } catch (err) {
    console.error("GET /api/artist/contribution error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
