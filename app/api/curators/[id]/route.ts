import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const curator = await prisma.curator.findUnique({
    where: { id: params.id },
  });
  if (!curator) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const exhibitions = await prisma.exhibition.findMany({
    where: { curatorId: params.id, isPublic: true },
    include: {
      space: { select: { id: true, name: true, type: true, city: true, country: true } },
      artists: {
        where: { status: "confirmed" },
        include: { artist: { select: { id: true, name: true, artistId: true, country: true, genre: true, profileImage: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startDate: "desc" },
  });

  // unique artists across all exhibitions
  const artistMap = new Map<string, { artist: any; count: number }>();
  for (const ex of exhibitions) {
    for (const ea of ex.artists) {
      const a = ea.artist;
      if (!artistMap.has(a.artistId)) artistMap.set(a.artistId, { artist: a, count: 0 });
      artistMap.get(a.artistId)!.count++;
    }
  }
  const artists = Array.from(artistMap.values()).sort((a, b) => b.count - a.count);

  return NextResponse.json({ curator, exhibitions, artists });
}
