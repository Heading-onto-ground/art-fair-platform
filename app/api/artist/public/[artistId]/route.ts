import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { artistId: string } }) {
  const { artistId } = params;

  const profileRows = await prisma.$queryRawUnsafe(
    `SELECT "artistId", name, "exhibitions_public" FROM "ArtistProfile" WHERE "artistId" = $1 LIMIT 1`,
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

  return NextResponse.json({ name: profile.name, artistId: profile.artistId, exhibitions });
}
