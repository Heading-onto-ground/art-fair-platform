import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { artistId: string } }) {
  const { artistId } = params;

  const profileRows = await prisma.$queryRawUnsafe(
    `SELECT "artistId", name, "exhibitions_public", "workNote", id, country, city, genre, "startedYear", instagram, website FROM "ArtistProfile" WHERE "artistId" = $1 LIMIT 1`,
    artistId
  ).catch(() => []) as any[];

  const profile = profileRows[0];
  if (!profile || !profile.exhibitions_public) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const exhibitions = await prisma.$queryRawUnsafe(
    `SELECT "galleryName", theme, country, city, "acceptedAt"
     FROM artist_exhibitions WHERE "artistId" = (
       SELECT "userId" FROM "ArtistProfile" WHERE "artistId" = $1 LIMIT 1
     ) ORDER BY "acceptedAt" DESC`,
    artistId
  ).catch(() => []) as any[];

  const series = await prisma.artworkSeries.findMany({
    where: { artistId: profile.id, isPublic: true },
    orderBy: { startYear: "desc" },
    select: { id: true, title: true, description: true, startYear: true, endYear: true, works: true },
  }).catch(() => []);

  const artEvents = await prisma.artEvent.findMany({
    where: { artistId: profile.id, isPublic: true },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: { id: true, eventType: true, title: true, year: true, description: true },
  }).catch(() => []);

  return NextResponse.json({
    name: profile.name,
    artistId: profile.artistId,
    workNote: profile.workNote ?? null,
    country: profile.country ?? null,
    city: profile.city ?? null,
    genre: profile.genre ?? null,
    startedYear: profile.startedYear ?? null,
    instagram: profile.instagram ?? null,
    website: profile.website ?? null,
    exhibitions,
    series,
    artEvents,
  });
}
