import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const curators = await prisma.curator.findMany({
    include: { _count: { select: { exhibitions: true } } },
  });
  const sorted = curators.sort((a, b) => b._count.exhibitions - a._count.exhibitions);
  return NextResponse.json({ curators: sorted.map(c => ({ id: c.id, name: c.name, organization: c.organization, exhibitionCount: c._count.exhibitions })) });
}
