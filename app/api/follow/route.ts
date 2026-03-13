import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/follow?artistId=xxx  → { following: bool, count: number }
// GET /api/follow?feed=1        → { feed: ArtEvent[] with artist info }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artistId = searchParams.get("artistId");
  const feed = searchParams.get("feed");

  const session = getServerSession();

  if (feed === "1") {
    if (!session) return NextResponse.json({ feed: [] });
    const follows = await prisma.follow.findMany({
      where: { followerId: session.userId },
      select: { followingId: true },
    });
    const artistProfileIds = follows.map(f => f.followingId);
    if (artistProfileIds.length === 0) return NextResponse.json({ feed: [] });

    const events = await prisma.artEvent.findMany({
      where: { artistId: { in: artistProfileIds }, isPublic: true },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { artist: { select: { name: true, artistId: true, profileImage: true } } },
    });
    return NextResponse.json({ feed: events });
  }

  if (artistId) {
    const profile = await prisma.artistProfile.findUnique({ where: { artistId }, select: { id: true } });
    if (!profile) return NextResponse.json({ following: false, count: 0 });
    const count = await prisma.follow.count({ where: { followingId: profile.id } });
    const following = session?.userId
      ? !!(await prisma.follow.findFirst({ where: { followerId: session.userId, followingId: profile.id } }))
      : false;
    return NextResponse.json({ following, count });
  }

  return NextResponse.json({ error: "missing params" }, { status: 400 });
}

// POST { artistId } → follow
// DELETE { artistId } → unfollow
export async function POST(req: NextRequest) {
  const session = getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { artistId } = await req.json().catch(() => ({}));
  if (!artistId) return NextResponse.json({ error: "missing artistId" }, { status: 400 });

  const profile = await prisma.artistProfile.findUnique({ where: { artistId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: session.userId, followingId: profile.id } },
    create: { followerId: session.userId, followingId: profile.id },
    update: {},
  });
  const count = await prisma.follow.count({ where: { followingId: profile.id } });
  return NextResponse.json({ following: true, count });
}

export async function DELETE(req: NextRequest) {
  const session = getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { artistId } = await req.json().catch(() => ({}));
  if (!artistId) return NextResponse.json({ error: "missing artistId" }, { status: 400 });

  const profile = await prisma.artistProfile.findUnique({ where: { artistId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.follow.deleteMany({
    where: { followerId: session.userId, followingId: profile.id },
  });
  const count = await prisma.follow.count({ where: { followingId: profile.id } });
  return NextResponse.json({ following: false, count });
}
