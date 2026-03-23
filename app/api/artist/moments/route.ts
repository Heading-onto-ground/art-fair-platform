import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/artist/moments
 * - ?recent=true: Public. Last 30 min moments from ALL artists (Artists working now).
 * - No params: Requires artist session. List artist's own moments.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const recent = searchParams.get("recent") === "true";

    if (recent) {
      // Artists working now — public, last 24 hours (feed view)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const moments = await prisma.artistMoment.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { reactions: true },
      });

      const session = getServerSession();

      type MomentWithReactions = (typeof moments)[number];
      const momentsWithReactions = await Promise.all(
        moments.map(async (m: MomentWithReactions) => {
          const counts = m.reactions.reduce(
            (acc: Record<string, number>, r: { reactionType: string }) => {
              acc[r.reactionType] = (acc[r.reactionType] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );
          let myReaction: string | null = null;
          if (session) {
            const mine = m.reactions.find((r: { userId: string; reactionType: string }) => r.userId === session.userId);
            if (mine) myReaction = mine.reactionType;
          }
          return {
            id: m.id,
            artistId: m.artistId,
            artistName: m.artistName,
            imageUri: m.imageUrl,
            note: m.note,
            state: m.state,
            medium: m.medium,
            createdAt: m.createdAt.toISOString(),
            reactions: counts,
            myReaction,
          };
        })
      );

      return NextResponse.json({
        ok: true,
        moments: momentsWithReactions,
      });
    }

    // My moments — requires artist session
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const moments = await prisma.artistMoment.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    type Moment = (typeof moments)[number];
    return NextResponse.json({
      ok: true,
      moments: moments.map((m: Moment) => ({
        id: m.id,
        artistId: m.artistId,
        artistName: m.artistName,
        imageUri: m.imageUrl,
        note: m.note,
        state: m.state,
        medium: m.medium,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/artist/moments failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

/**
 * POST /api/artist/moments
 * Create an artist ritual moment.
 * Requires artist session (cookie).
 */
export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
    }

    const note = typeof body.note === "string" ? body.note.trim() || null : null;
    const state = String(body.state || "working");
    const medium = String(body.medium || "painting");
    const imageUrl = String(body.imageUrl || body.imageUri || "").trim();

    const validStates = [
      "working",
      "thinking",
      "stuck",
      "experimenting",
      "exploring",
      "refining",
      "destroying",
      "restarting",
    ];
    const validMedia = ["painting", "drawing", "sculpture", "writing", "photography", "mixed media"];
    if (!validStates.includes(state) || !validMedia.includes(medium)) {
      return NextResponse.json({ ok: false, error: "invalid state or medium" }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: "image required" }, { status: 400 });
    }

    const profile = await getProfileByUserId(session.userId);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json({ ok: false, error: "artist profile required" }, { status: 403 });
    }

    const artistId = profile.artistId;
    const artistName = profile.name;

    const moment = await prisma.artistMoment.create({
      data: {
        userId: session.userId,
        artistId,
        artistName,
        imageUrl,
        note,
        state,
        medium,
      },
    });

    return NextResponse.json({
      ok: true,
      moment: {
        id: moment.id,
        artistId: moment.artistId,
        artistName: moment.artistName,
        imageUri: moment.imageUrl,
        note: moment.note,
        state: moment.state,
        medium: moment.medium,
        createdAt: moment.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("POST /api/artist/moments failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
