import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/curator/lists → my lists with items
// GET /api/curator/lists?curatorId=xxx → public lists
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const curatorId = searchParams.get("curatorId");

  if (curatorId) {
    const profile = await prisma.curatorProfile.findUnique({ where: { curatorId }, select: { id: true, name: true } });
    if (!profile) return NextResponse.json({ lists: [] });
    const lists = await prisma.curatorList.findMany({
      where: { curatorId: profile.id, isPublic: true },
      include: { items: { orderBy: { order: "asc" }, include: { list: false } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ curatorName: profile.name, lists });
  }

  const session = getServerSession();
  if (!session || session.role !== "curator") return NextResponse.json({ lists: [] });

  const profile = await prisma.curatorProfile.findFirst({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ lists: [] });

  const lists = await prisma.curatorList.findMany({
    where: { curatorId: profile.id },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ lists });
}

// POST { title, description, isPublic } → create list
export async function POST(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "curator") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await prisma.curatorProfile.findFirst({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 400 });

  const { title, description, isPublic } = await req.json().catch(() => ({}));
  if (!title?.trim()) return NextResponse.json({ error: "missing title" }, { status: 400 });

  const list = await prisma.curatorList.create({
    data: { curatorId: profile.id, title: title.trim(), description: description ?? null, isPublic: isPublic ?? true },
  });
  return NextResponse.json({ list }, { status: 201 });
}

// DELETE { listId } → delete list
export async function DELETE(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "curator") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { listId } = await req.json().catch(() => ({}));
  if (!listId) return NextResponse.json({ error: "missing listId" }, { status: 400 });

  const profile = await prisma.curatorProfile.findFirst({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 400 });

  await prisma.curatorList.deleteMany({ where: { id: listId, curatorId: profile.id } });
  return NextResponse.json({ ok: true });
}
