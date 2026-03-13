import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const space = await prisma.space.findUnique({
    where: { id: params.id },
  });
  if (!space) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const exhibitions = await prisma.exhibition.findMany({
    where: { spaceId: params.id, isPublic: true },
    include: {
      curator: { select: { id: true, name: true, organization: true } },
      artists: {
        where: { status: "confirmed" },
        include: { artist: { select: { id: true, name: true, artistId: true, country: true, genre: true, profileImage: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ space, exhibitions });
}
