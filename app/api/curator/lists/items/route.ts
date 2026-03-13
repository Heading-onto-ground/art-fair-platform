import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { listId, artistId, note } → add artist to list
export async function POST(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "curator") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await prisma.curatorProfile.findFirst({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 400 });

  const { listId, artistId, note } = await req.json().catch(() => ({}));
  if (!listId || !artistId) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const list = await prisma.curatorList.findFirst({ where: { id: listId, curatorId: profile.id } });
  if (!list) return NextResponse.json({ error: "list not found" }, { status: 404 });

  const artistProfile = await prisma.artistProfile.findUnique({ where: { artistId }, select: { id: true } });
  if (!artistProfile) return NextResponse.json({ error: "artist not found" }, { status: 404 });

  const count = await prisma.curatorListItem.count({ where: { listId } });
  const item = await prisma.curatorListItem.upsert({
    where: { listId_artistId: { listId, artistId: artistProfile.id } },
    create: { listId, artistId: artistProfile.id, note: note ?? null, order: count },
    update: { note: note ?? null },
  });
  return NextResponse.json({ item }, { status: 201 });
}

// DELETE { listId, artistId } → remove artist from list
export async function DELETE(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "curator") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await prisma.curatorProfile.findFirst({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 400 });

  const { listId, artistId } = await req.json().catch(() => ({}));
  if (!listId || !artistId) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const artistProfile = await prisma.artistProfile.findUnique({ where: { artistId }, select: { id: true } });
  if (!artistProfile) return NextResponse.json({ ok: true });

  await prisma.curatorListItem.deleteMany({ where: { listId, artistId: artistProfile.id } });
  return NextResponse.json({ ok: true });
}
