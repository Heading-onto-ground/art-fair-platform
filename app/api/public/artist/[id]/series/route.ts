import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const profile = await prisma.artistProfile.findUnique({
    where: { userId: decodeURIComponent(params.id) },
    select: {
      series: {
        where: { isPublic: true },
        orderBy: { startYear: "desc" },
        select: { id: true, title: true, description: true, startYear: true, endYear: true, works: true },
      },
    },
  }).catch(() => null);

  if (!profile) return NextResponse.json({ series: [] });
  return NextResponse.json({ series: profile.series });
}
