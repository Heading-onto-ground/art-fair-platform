import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, "openCallId", "galleryName", theme, country, city, "externalUrl", "acceptedAt"
       FROM artist_exhibitions
       WHERE "artistId" = $1
       ORDER BY "acceptedAt" DESC`,
      session.userId
    ) as any[];
    return NextResponse.json({ exhibitions: rows });
  } catch {
    // Table doesn't exist yet = no exhibitions
    return NextResponse.json({ exhibitions: [] });
  }
}
