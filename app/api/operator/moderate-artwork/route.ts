import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/operatorAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ArtworkRow = {
  id: string;
  title: string | null;
  caption: string | null;
  imageUrl: string;
  isPublic: boolean;
  createdAt: Date;
  artist: { name: string; artistId: string } | null;
};

/** GET — recent feed posts INCLUDING hidden ones, so operators can moderate/unhide. */
export async function GET(req: NextRequest) {
  const ctx = await getOperatorContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(120, Math.max(1, Number(searchParams.get("limit") || "60")));

  const rows = await prisma.artwork.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      caption: true,
      imageUrl: true,
      isPublic: true,
      createdAt: true,
      artist: { select: { name: true, artistId: true } },
    },
  }) as ArtworkRow[];

  const posts = rows.map((a) => ({
    id: a.id,
    title: a.title,
    caption: a.caption,
    imageUrl: a.imageUrl,
    isPublic: a.isPublic,
    createdAt: a.createdAt.getTime(),
    artistName: a.artist?.name ?? "(unknown)",
    artistId: a.artist?.artistId ?? null,
  }));

  return NextResponse.json({ posts });
}

/** POST — moderate a feed post: hide | unhide | delete. */
export async function POST(req: NextRequest) {
  const ctx = await getOperatorContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "").trim();
  const action = String(body?.action || "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!["hide", "unhide", "delete"].includes(action)) {
    return NextResponse.json({ error: "action must be hide | unhide | delete" }, { status: 400 });
  }

  const existing = await prisma.artwork.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "delete") {
    await prisma.artwork.delete({ where: { id } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const updated = await prisma.artwork.update({
    where: { id },
    data: { isPublic: action === "unhide" },
    select: { id: true, isPublic: true },
  });
  return NextResponse.json({ ok: true, isPublic: updated.isPublic });
}
