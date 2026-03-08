import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET — list series for authenticated artist */
export async function GET() {
  const session = getServerSession();
  if (!session || session.role !== "artist") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await prisma.artistProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ series: [] });

  const series = await prisma.artworkSeries.findMany({
    where: { artistId: profile.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ series });
}

/** POST — create series */
export async function POST(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "artist") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await prisma.artistProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 });

  const { title, description, startYear, endYear, works, isPublic } = await req.json().catch(() => ({}));
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const series = await prisma.artworkSeries.create({
    data: {
      artistId: profile.id,
      title: title.trim(),
      description: description?.trim() || null,
      startYear: startYear ? Number(startYear) : null,
      endYear: endYear ? Number(endYear) : null,
      works: works?.trim() || null,
      isPublic: isPublic !== false,
    },
  });
  return NextResponse.json({ ok: true, series });
}

/** PATCH — update series */
export async function PATCH(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "artist") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, title, description, startYear, endYear, works, isPublic } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const profile = await prisma.artistProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  const existing = await prisma.artworkSeries.findUnique({ where: { id }, select: { artistId: true } });
  if (!existing || existing.artistId !== profile?.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const updated = await prisma.artworkSeries.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(startYear !== undefined ? { startYear: startYear ? Number(startYear) : null } : {}),
      ...(endYear !== undefined ? { endYear: endYear ? Number(endYear) : null } : {}),
      ...(works !== undefined ? { works: works?.trim() || null } : {}),
      ...(isPublic !== undefined ? { isPublic } : {}),
    },
  });
  return NextResponse.json({ ok: true, series: updated });
}

/** DELETE — delete series */
export async function DELETE(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "artist") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const profile = await prisma.artistProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  const existing = await prisma.artworkSeries.findUnique({ where: { id }, select: { artistId: true } });
  if (!existing || existing.artistId !== profile?.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.artworkSeries.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
