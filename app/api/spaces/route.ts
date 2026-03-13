import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const spaces = await prisma.space.findMany({
      include: { _count: { select: { exhibitions: true } } },
    });
    const sorted = spaces.sort((a: { _count: { exhibitions: number } }, b: { _count: { exhibitions: number } }) => b._count.exhibitions - a._count.exhibitions);
    return NextResponse.json({ spaces: sorted.map(s => ({ id: s.id, name: s.name, type: s.type, city: s.city, country: s.country, exhibitionCount: s._count.exhibitions })) });
  } catch {
    return NextResponse.json({ spaces: [] });
  }
}
