import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadHashtagsForArtworks } from "@/lib/artworkHashtags";
import { serializeArtwork } from "@/lib/artworkSerialize";

export const dynamic = "force-dynamic";

/**
 * GET /api/artworks/feed
 * Instagram-style home feed — all public posts, newest first.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(60, Math.max(1, Number(searchParams.get("limit") || "30")));
  const postType = searchParams.get("postType") || "all";

  const artworks = await prisma.artwork.findMany({
    where: {
      isPublic: true,
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
