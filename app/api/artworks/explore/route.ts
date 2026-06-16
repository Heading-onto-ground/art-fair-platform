import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeHashtag } from "@/lib/hashtags";
import { loadHashtagsForArtworks } from "@/lib/artworkHashtags";
import { serializeArtwork } from "@/lib/artworkSerialize";

export const dynamic = "force-dynamic";

/**
 * GET /api/artworks/explore
 * Old-Instagram style: hashtag → recent posts (newest first).
 * Public — galleries, curators, artists can search.
 *
 * Query: tag (required), limit (default 48), postType (work|exhibition|all)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = normalizeHashtag(searchParams.get("tag") || "");
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "48")));
  const postType = searchParams.get("postType") || "all";

  if (!tag || tag.length < 2) {
    return NextResponse.json({ error: "tag required" }, { status: 400 });
  }

  const hashtag = await prisma.hashtag.findUnique({
    where: { tag },
    select: { id: true, tag: true },
  });

  if (!hashtag) {
    return NextResponse.json({
      tag,
      total: 0,
      posts: [],
      sort: "recent",
    });
  }

  const links = await prisma.artworkHashtag.findMany({
    where: { hashtagId: hashtag.id },
    select: { artworkId: true },
  });

  const artworkIds = links.map((l: { artworkId: string }) => l.artworkId);
  if (artworkIds.length === 0) {
    return NextResponse.json({ tag, total: 0, posts: [], sort: "recent" });
  }

  const artworks = await prisma.artwork.findMany({
    where: {
      id: { in: artworkIds },
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
    tag: hashtag.tag,
    total: artworks.length,
    sort: "recent",
    posts: artworks.map((a: (typeof artworks)[number]) => serializeArtwork(a, tagMap.get(a.id) ?? [])),
  });
}
