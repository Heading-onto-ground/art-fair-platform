import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function ensurePublicColumn() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "exhibitions_public" BOOLEAN NOT NULL DEFAULT FALSE`
    );
  } catch { /* already exists */ }
}

export async function GET() {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensurePublicColumn();

  const [profileRows, exhibitionRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT "artistId", name, "exhibitions_public" FROM "ArtistProfile" WHERE "userId" = $1 LIMIT 1`,
      session.userId
    ).catch(() => []) as Promise<any[]>,
    prisma.$queryRawUnsafe(
      `SELECT id, "openCallId", "galleryName", theme, country, city, "externalUrl", "acceptedAt"
       FROM artist_exhibitions WHERE "artistId" = $1 ORDER BY "acceptedAt" DESC`,
      session.userId
    ).catch(() => []) as Promise<any[]>,
  ]);

  const profile = (profileRows as any[])[0] ?? null;
  return NextResponse.json({
    exhibitions: exhibitionRows as any[],
    artistId: profile?.artistId ?? null,
    exhibitionsPublic: profile?.exhibitions_public ?? false,
  });
}

export async function PATCH(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { exhibitionsPublic } = await req.json().catch(() => ({}));
  if (typeof exhibitionsPublic !== "boolean") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  await ensurePublicColumn();
  await prisma.$executeRawUnsafe(
    `UPDATE "ArtistProfile" SET "exhibitions_public" = $1 WHERE "userId" = $2`,
    exhibitionsPublic, session.userId
  );

  return NextResponse.json({ ok: true });
}
