import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/hashtags/suggest?q=mem — prefix autocomplete */
export async function GET(req: NextRequest) {
  const q = String(new URL(req.url).searchParams.get("q") || "")
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .slice(0, 32);

  if (q.length < 1) {
    return NextResponse.json({ tags: [] });
  }

  const rows = await prisma.hashtag.findMany({
    where: { tag: { startsWith: q } },
    orderBy: { tag: "asc" },
    take: 12,
    select: { tag: true },
  });

  return NextResponse.json({ tags: rows.map((r: { tag: string }) => r.tag) });
}
