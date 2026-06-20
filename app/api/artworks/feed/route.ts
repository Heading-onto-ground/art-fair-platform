import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { loadHashtagsForArtworks } from "@/lib/artworkHashtags";
import { serializeArtwork } from "@/lib/artworkSerialize";

export const dynamic = "force-dynamic";

/**
 * GET /api/artworks/feed
 * Instagram-style home feed — public posts, newest first.
 * - default: all public posts
 * - ?scope=following: only posts from artists the viewer follows (requires session)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(60, Math.max(1, Number(searchParams.get("limit") || "30")));
  const postType = searchParams.get("postType") || "all";
  const scope = searchParams.get("scope");

  let followingFilter: Record<string, unknown> = {};
  if (scope === "following") {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ total: 0, sort: "recent", scope: "following", posts: [] });
    }
    const follows = await prisma.follow.findMany({
      where: { followerId: session.userId },
      select: { followingId: true },
    });
    const followingIds = follows.map((f: { followingId: string }) => f.followingId);
    if (followingIds.length === 0) {
      return NextResponse.json({ total: 0, sort: "recent", scope: "following", posts: [] });
    }
    followingFilter = { artistId: { in: followingIds } };
  }

  const artworks = await prisma.artwork.findMany({
    where: {
      isPublic: true,
      ...followingFilter,
      ...(postType === "work" || postType === "exhibition" ? { postType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      series: { select: { id: true, title: true } },
      artist: {
        select: {
          id: true,
          artistId: true,
          name: true,
          genre: true,
          country: true,
          city: true,
          profileImage: true,
        },
      },
    },
  });

  const tagMap = await loadHashtagsForArtworks(artworks.map((a: { id: string }) => a.id));

  return NextResponse.json({
    total: artworks.length,
    sort: "recent",
    posts: artworks.map((a: (typeof artworks)[number]) =>
      serializeArtwork(a, tagMap.get(a.id) ?? []),
    ),
  });
}
