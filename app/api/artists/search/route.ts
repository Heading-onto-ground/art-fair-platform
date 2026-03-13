import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 20);

    if (q.length < 2) {
      return NextResponse.json({ artists: [] });
    }

    const artists = await prisma.artistProfile.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { artistId: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: {
        id: true,
        artistId: true,
        name: true,
        country: true,
        city: true,
        genre: true,
      },
    });

    return NextResponse.json({ artists });
  } catch (e) {
    console.error("GET /api/artists/search failed:", e);
    return NextResponse.json({ artists: [] });
  }
}
