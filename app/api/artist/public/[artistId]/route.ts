import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeArtistTrust } from "@/lib/trustScore";
import { getVerificationByArtistId } from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { artistId: string } }) {
  const { artistId } = params;
  type ProfileRow = {
    userId: string;
    artistId: string;
    name: string;
    exhibitions_public: boolean;
    workNote?: string | null;
    bio?: string | null;
    id: string;
    country?: string | null;
    city?: string | null;
    genre?: string | null;
    startedYear?: number | null;
    instagram?: string | null;
    website?: string | null;
    profileImage?: string | null;
    portfolioUrl?: string | null;
  };
  type ExhibitionRow = {
    galleryName: string;
    theme: string;
    country: string;
    city: string;
    acceptedAt: string;
  };

  const profileRows = await prisma.$queryRawUnsafe(
    `SELECT "userId", "artistId", name, "exhibitions_public", "workNote", bio, id, country, city, genre, "startedYear", instagram, website, "profileImage", "portfolioUrl" FROM "ArtistProfile" WHERE "artistId" = $1 LIMIT 1`,
    artistId
  ).catch(() => []) as ProfileRow[];

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
  ).catch(() => []) as ExhibitionRow[];

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

  const selfExhibitions = await prisma.exhibition.findMany({
    where: {
      isPublic: true,
      OR: [
        { createdBy: profile.id },
        { artists: { some: { artistId: profile.id } } },
      ],
    },
    include: {
      space: true,
      curator: true,
      artists: {
        include: {
          artist: { select: { id: true, name: true, artistId: true } },
        },
      },
    },
    orderBy: { startDate: "desc" },
  }).catch(() => []);

  const trust = computeArtistTrust({
    bio: profile.bio ?? null,
    country: profile.country ?? null,
    city: profile.city ?? null,
    instagram: profile.instagram ?? null,
    website: profile.website ?? null,
    profileImage: profile.profileImage ?? null,
    hasPortfolio: !!profile.portfolioUrl,
    seriesCount: series.length,
    artEventCount: artEvents.length,
    exhibitionCount: selfExhibitions.length + exhibitions.length,
  });
  const verification = await getVerificationByArtistId(String(profile.artistId || ""));

  return NextResponse.json({
    name: profile.name,
    artistId: profile.artistId,
    userId: profile.userId ?? null,
    workNote: profile.workNote ?? null,
    bio: profile.bio ?? null,
    country: profile.country ?? null,
    city: profile.city ?? null,
    genre: profile.genre ?? null,
    startedYear: profile.startedYear ?? null,
    instagram: profile.instagram ?? null,
    website: profile.website ?? null,
    profileImage: profile.profileImage ?? null,
    exhibitions,
    selfExhibitions,
    series,
    artEvents,
    trustScore: trust.score,
    trustLevel: trust.level,
    trustSignals: trust.signals,
    verification: verification
      ? {
          verified: true,
          label: verification.label,
          approvedAt: verification.approvedAt,
        }
      : { verified: false, label: null, approvedAt: null },
  });
}
