import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getProfileId(userId: string) {
  const p = await prisma.artistProfile.findUnique({ where: { userId }, select: { id: true } });
  return p?.id ?? null;
}

export async function GET() {
  const session = getServerSession();
  if (!session || session.role !== "artist") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profileId = await getProfileId(session.userId);
  if (!profileId) return NextResponse.json({ artEvents: [] });
  const artEvents = await prisma.artEvent.findMany({
    where: { artistId: profileId },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ artEvents });
}

export async function POST(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "artist") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profileId = await getProfileId(session.userId);
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body?.title?.trim() || !body?.eventType || !body?.year) {
    return NextResponse.json({ error: "title_eventType_year_required" }, { status: 400 });
  }
  const artEvent = await prisma.artEvent.create({
    data: {
      artistId: profileId,
      eventType: body.eventType,
      title: body.title.trim(),
      year: Number(body.year),
      description: body.description?.trim() || null,
      isPublic: body.isPublic !== false,
    },
  });
  return NextResponse.json({ ok: true, artEvent });
}

export async function PATCH(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "artist") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profileId = await getProfileId(session.userId);
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  const existing = await prisma.artEvent.findFirst({ where: { id: body.id, artistId: profileId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const artEvent = await prisma.artEvent.update({
    where: { id: body.id },
    data: {
      ...(body.title ? { title: body.title.trim() } : {}),
      ...(body.eventType ? { eventType: body.eventType } : {}),
      ...(body.year !== undefined ? { year: Number(body.year) } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
      ...(body.isPublic !== undefined ? { isPublic: !!body.isPublic } : {}),
    },
  });
  return NextResponse.json({ ok: true, artEvent });
}

export async function DELETE(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "artist") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profileId = await getProfileId(session.userId);
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 400 });
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  const existing = await prisma.artEvent.findFirst({ where: { id, artistId: profileId } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.artEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
