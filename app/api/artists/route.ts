import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(500, Number(url.searchParams.get("limit") ?? "200"));
  const offset = Number(url.searchParams.get("offset") ?? "0");
  const q = url.searchParams.get("q")?.trim() ?? "";

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { genre: { contains: q, mode: "insensitive" as const } },
          { country: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [artists, total] = await Promise.all([
    prisma.artistProfile.findMany({
      where,
      select: {
        id: true,
        artistId: true,
        name: true,
        genre: true,
        country: true,
        city: true,
        profileImage: true,
        instagram: true,
        startedYear: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.artistProfile.count({ where }),
  ]);

  return NextResponse.json({ artists, total });
}
