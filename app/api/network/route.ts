import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns nodes and edges for network visualization
// Nodes: artists, galleries (from accepted applications)
// Edges: artist <-> gallery (via accepted applications), artist <-> artist (via shared exhibitions)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "80"), 150);

  // Artist nodes
  const artists = await prisma.artistProfile.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true, artistId: true, name: true, country: true, genre: true, profileImage: true },
  });

  // Accepted applications → artist-gallery edges
  const applications = await prisma.application.findMany({
    where: { status: "accepted" },
    select: { artistId: true, galleryId: true, openCallId: true },
    take: 300,
  });

  // OpenCalls for gallery names
  const openCallIds = [...new Set(applications.map((a: { artistId: string; galleryId: string; openCallId: string }) => a.openCallId))];
  type OcRow = { id: string; gallery: string; galleryId: string; country: string };
  const openCalls: OcRow[] = openCallIds.length > 0 ? await prisma.openCall.findMany({
    where: { id: { in: openCallIds } },
    select: { id: true, gallery: true, galleryId: true, country: true },
  }) as OcRow[] : [];
  const ocMap = new Map(openCalls.map((oc) => [oc.id, oc]));

  // Build unique gallery nodes from accepted applications
  const galleryMap = new Map<string, { id: string; name: string; country?: string }>();
  for (const app of applications) {
    if (!galleryMap.has(app.galleryId)) {
      const oc = ocMap.get(app.openCallId);
      if (oc) galleryMap.set(app.galleryId, { id: app.galleryId, name: oc.gallery, country: oc.country });
    }
  }

  const artistIdMap = new Map(artists.map(a => [a.id, a]));

  // Nodes
  const nodes = [
    ...artists.map(a => ({ id: `artist_${a.id}`, label: a.name, type: "artist" as const, sub: a.genre ?? a.country ?? "", image: a.profileImage ?? null, artistId: a.artistId })),
    ...[...galleryMap.values()].map(g => ({ id: `gallery_${g.id}`, label: g.name, type: "gallery" as const, sub: g.country ?? "", image: null, artistId: null })),
  ];

  // Edges: artist <-> gallery
  const edgeSet = new Set<string>();
  const edges: { source: string; target: string; type: string }[] = [];
  for (const app of applications) {
    if (!artistIdMap.has(app.artistId)) continue;
    if (!galleryMap.has(app.galleryId)) continue;
    const key = `artist_${app.artistId}|gallery_${app.galleryId}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ source: `artist_${app.artistId}`, target: `gallery_${app.galleryId}`, type: "exhibited" });
    }
  }

  return NextResponse.json({ nodes, edges });
}
