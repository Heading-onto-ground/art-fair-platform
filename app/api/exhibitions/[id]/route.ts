import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const exhibition = await prisma.exhibition.findFirst({
    where: { id: params.id, isPublic: true },
    include: {
      space: true,
      curator: true,
      artists: {
        where: { status: "confirmed" },
        include: {
          artist: {
            select: { id: true, name: true, artistId: true, country: true, city: true, genre: true, profileImage: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!exhibition) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ exhibition });
}
