import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ArtistRow = { id: string; artistId: string; name: string; country: string | null; genre: string | null; profileImage: string | null };
type AppRow = { artistId: string; galleryId: string; openCallId: string };
type OcRow = { id: string; gallery: string; galleryId: string; country: string };

type EdgeType = "exhibited" | "co_present" | "witnessed" | "follows";
type Edge = { source: string; target: string; type: EdgeType };

/** Add all unordered pairs within a group of artist profile ids as undirected edges. */
function addCoPresentPairs(ids: string[], push: (a: string, b: string, t: EdgeType) => void) {
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      push(unique[i], unique[j], "co_present");
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "80"), 150);

  // ---- Relationship sources (artist↔artist) ----
  // co_present: same gathering or same exhibition
  const [gatheringAttendees, exhibitionArtists, follows, reactions] = await Promise.all([
    prisma.gatheringAttendee.findMany({
      select: { gatheringId: true, artistId: true },
      take: 2000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.exhibitionArtist.findMany({
      where: { status: "confirmed" },
      select: { exhibitionId: true, artistId: true },
      take: 2000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.follow.findMany({
      select: { followerId: true, followingId: true },
      take: 2000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.momentReaction.findMany({
      select: { userId: true, moment: { select: { artistId: true } } },
      take: 2000,
      orderBy: { createdAt: "desc" },
    }),
  ]) as [
    { gatheringId: string; artistId: string }[],
    { exhibitionId: string; artistId: string }[],
    { followerId: string; followingId: string }[],
    { userId: string; moment: { artistId: string } | null }[],
  ];

  // Resolve User.id -> ArtistProfile.id for follow/reaction sources.
  const sourceUserIds = [
    ...new Set([
      ...follows.map((f) => f.followerId),
      ...reactions.map((r) => r.userId),
    ]),
  ];
  const userToArtist = new Map<string, string>();
  if (sourceUserIds.length > 0) {
    const profiles = await prisma.artistProfile.findMany({
      where: { userId: { in: sourceUserIds } },
      select: { id: true, userId: true },
    }) as { id: string; userId: string }[];
    for (const p of profiles) userToArtist.set(p.userId, p.id);
  }

  // ---- Build edges referencing ArtistProfile.id, collect referenced artist ids ----
  const referencedArtistIds = new Set<string>();
  const rawEdges: Edge[] = [];
  const note = (id: string) => referencedArtistIds.add(id);
  const pushArtistEdge = (a: string, b: string, t: EdgeType) => {
    if (!a || !b || a === b) return;
    note(a);
    note(b);
    rawEdges.push({ source: `artist_${a}`, target: `artist_${b}`, type: t });
  };

  // co_present from gatherings
  const byGathering = new Map<string, string[]>();
  for (const ga of gatheringAttendees) {
    const arr = byGathering.get(ga.gatheringId) ?? [];
    arr.push(ga.artistId);
    byGathering.set(ga.gatheringId, arr);
  }
  for (const ids of byGathering.values()) addCoPresentPairs(ids, pushArtistEdge);

  // co_present from exhibitions
  const byExhibition = new Map<string, string[]>();
  for (const ea of exhibitionArtists) {
    const arr = byExhibition.get(ea.exhibitionId) ?? [];
    arr.push(ea.artistId);
    byExhibition.set(ea.exhibitionId, arr);
  }
  for (const ids of byExhibition.values()) addCoPresentPairs(ids, pushArtistEdge);

  // follows (directed: follower -> following)
  for (const f of follows) {
    const followerArtist = userToArtist.get(f.followerId);
    if (followerArtist) pushArtistEdge(followerArtist, f.followingId, "follows");
  }

  // witnessed (directed: reactor -> moment author)
  for (const r of reactions) {
    const reactorArtist = userToArtist.get(r.userId);
    const authorArtist = r.moment?.artistId;
    if (reactorArtist && authorArtist) pushArtistEdge(reactorArtist, authorArtist, "witnessed");
  }

  // ---- Nodes: recent artists ∪ artists referenced by any relationship ----
  const recentArtists: ArtistRow[] = await prisma.artistProfile.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true, artistId: true, name: true, country: true, genre: true, profileImage: true },
  }) as ArtistRow[];

  const recentIds = new Set(recentArtists.map((a) => a.id));
  const missingIds = [...referencedArtistIds].filter((id) => !recentIds.has(id));
  const extraArtists: ArtistRow[] = missingIds.length > 0 ? (await prisma.artistProfile.findMany({
    where: { id: { in: missingIds } },
    select: { id: true, artistId: true, name: true, country: true, genre: true, profileImage: true },
  }) as ArtistRow[]) : [];

  const artists = [...recentArtists, ...extraArtists];
  const artistIdMap = new Map(artists.map((a) => [a.id, a]));

  // ---- Gallery nodes + artist-gallery edges (existing behaviour) ----
  const applications: AppRow[] = await prisma.application.findMany({
    where: { status: "accepted" },
    select: { artistId: true, galleryId: true, openCallId: true },
    take: 300,
  }) as AppRow[];

  const openCallIds = [...new Set(applications.map((a) => a.openCallId))];
  const openCalls: OcRow[] = openCallIds.length > 0 ? await prisma.openCall.findMany({
    where: { id: { in: openCallIds } },
    select: { id: true, gallery: true, galleryId: true, country: true },
  }) as OcRow[] : [];
  const ocMap = new Map(openCalls.map((oc) => [oc.id, oc]));

  const galleryMap = new Map<string, { id: string; name: string; country?: string }>();
  for (const app of applications) {
    if (!galleryMap.has(app.galleryId)) {
      const oc = ocMap.get(app.openCallId);
      if (oc) galleryMap.set(app.galleryId, { id: app.galleryId, name: oc.gallery, country: oc.country });
    }
  }

  const nodes = [
    ...artists.map((a) => ({ id: `artist_${a.id}`, label: a.name, type: "artist" as const, sub: a.genre ?? a.country ?? "", country: a.country ?? "", genre: a.genre ?? "", image: a.profileImage ?? null, artistId: a.artistId })),
    ...[...galleryMap.values()].map((g) => ({ id: `gallery_${g.id}`, label: g.name, type: "gallery" as const, sub: g.country ?? "", country: g.country ?? "", genre: "", image: null, artistId: null })),
  ];
  const nodeIds = new Set(nodes.map((n) => n.id));

  // ---- Assemble final edge list (dedup, only between existing nodes) ----
  const edges: Edge[] = [];
  const seen = new Set<string>();

  // artist-gallery
  for (const app of applications) {
    if (!artistIdMap.has(app.artistId)) continue;
    if (!galleryMap.has(app.galleryId)) continue;
    const key = `exhibited|artist_${app.artistId}|gallery_${app.galleryId}`;
    if (!seen.has(key)) {
      seen.add(key);
      edges.push({ source: `artist_${app.artistId}`, target: `gallery_${app.galleryId}`, type: "exhibited" });
    }
  }

  // artist-artist
  for (const e of rawEdges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    // co_present is undirected → dedup regardless of order
    const pair = e.type === "co_present" ? [e.source, e.target].sort().join("|") : `${e.source}|${e.target}`;
    const key = `${e.type}|${pair}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push(e);
  }

  return NextResponse.json({ nodes, edges });
}
