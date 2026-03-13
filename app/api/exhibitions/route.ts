import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/exhibitions?city=Seoul&country=KR&curatorId=xxx&spaceId=xxx&artistId=xxx&q=search&limit=30&offset=0
export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = url.searchParams.get("city");
  const country = url.searchParams.get("country");
  const curatorId = url.searchParams.get("curatorId");
  const spaceId = url.searchParams.get("spaceId");
  const artistId = url.searchParams.get("artistId");
  const q = url.searchParams.get("q");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const where: any = { isPublic: true };

  if (city) where.city = { contains: city, mode: "insensitive" };
  if (country) where.country = { equals: country, mode: "insensitive" };
  if (curatorId) where.curatorId = curatorId;
  if (spaceId) where.spaceId = spaceId;
  if (artistId) where.artists = { some: { artistId, status: "confirmed" } };
  if (q) where.title = { contains: q, mode: "insensitive" };

  const [exhibitions, total] = await Promise.all([
    prisma.exhibition.findMany({
      where,
      include: {
        space: { select: { id: true, name: true, type: true, city: true, country: true } },
        curator: { select: { id: true, name: true, organization: true } },
        artists: {
          where: { status: "confirmed" },
          include: { artist: { select: { id: true, name: true, artistId: true, country: true, genre: true, profileImage: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { startDate: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.exhibition.count({ where }),
  ]);

  return NextResponse.json({ exhibitions, total });
}
