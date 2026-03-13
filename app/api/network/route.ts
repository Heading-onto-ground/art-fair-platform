import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ArtistRow = { id: string; artistId: string; name: string; country: string | null; genre: string | null; profileImage: string | null };
type AppRow = { artistId: string; galleryId: string; openCallId: string };
type OcRow = { id: string; gallery: string; galleryId: string; country: string };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "80"), 150);

  const artists: ArtistRow[] = await prisma.artistProfile.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true, artistId: true, name: true, country: true, genre: true, profileImage: true },
  }) as ArtistRow[];

  const applications: AppRow[] = await prisma.application.findMany({
    where: { status: "accepted" },
    select: { artistId: true, galleryId: true, openCallId: true },
    take: 300,
  }) as AppRow[];

  const openCallIds = [...new Set(applications.map((a: AppRow) => a.openCallId))];
  const openCalls: OcRow[] = openCallIds.length > 0 ? await prisma.openCall.findMany({
    where: { id: { in: openCallIds } },
    select: { id: true, gallery: true, galleryId: true, country: true },
  }) as OcRow[] : [];
  const ocMap = new Map(openCalls.map((oc: OcRow) => [oc.id, oc]));

  const galleryMap = new Map<string, { id: string; name: string; country?: string }>();
  for (const app of applications) {
    if (!galleryMap.has(app.galleryId)) {
      const oc = ocMap.get(app.openCallId);
      if (oc) galleryMap.set(app.galleryId, { id: app.galleryId, name: oc.gallery, country: oc.country });
    }
  }

  const artistIdMap = new Map(artists.map((a: ArtistRow) => [a.id, a]));

  const nodes = [
    ...artists.map((a: ArtistRow) => ({ id: `artist_${a.id}`, label: a.name, type: "artist" as const, sub: a.genre ?? a.country ?? "", country: a.country ?? "", genre: a.genre ?? "", image: a.profileImage ?? null, artistId: a.artistId })),
    ...[...galleryMap.values()].map((g) => ({ id: `gallery_${g.id}`, label: g.name, type: "gallery" as const, sub: g.country ?? "", country: g.country ?? "", genre: "", image: null, artistId: null })),
  ];

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
