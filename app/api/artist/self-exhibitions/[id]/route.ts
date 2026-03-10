import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getArtistProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.artistProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

// POST /api/artist/self-exhibitions/[id] — 다른 작가 초대
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profileId = await getArtistProfileId(session.userId);
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 400 });

  const exhibitionId = params.id;

  // 이 전시의 creator인지 확인
  const exhibition = await prisma.exhibition.findFirst({
    where: { id: exhibitionId, createdBy: profileId },
  });
  if (!exhibition) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { inviteArtistId } = await req.json().catch(() => ({}));
  if (!inviteArtistId?.trim()) {
    return NextResponse.json({ error: "inviteArtistId_required" }, { status: 400 });
  }

  // 초대할 작가가 존재하는지 확인 (artistId 필드로 조회)
  const targetArtist = await prisma.artistProfile.findFirst({
    where: { artistId: inviteArtistId.trim() },
    select: { id: true, name: true, artistId: true },
  });
  if (!targetArtist) {
    return NextResponse.json({ error: "artist_not_found" }, { status: 404 });
  }

  // 본인을 초대하는 것 방지
  if (targetArtist.id === profileId) {
    return NextResponse.json({ error: "cannot_invite_self" }, { status: 400 });
  }

  // 이미 초대/참여 중인지 확인
  const existing = await prisma.exhibitionArtist.findUnique({
    where: { exhibitionId_artistId: { exhibitionId, artistId: targetArtist.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "already_invited", status: existing.status }, { status: 409 });
  }

  const invite = await prisma.exhibitionArtist.create({
    data: {
      exhibitionId,
      artistId: targetArtist.id,
      status: "invited",
      invitedBy: profileId,
    },
  });

  return NextResponse.json({ ok: true, invite, artist: targetArtist });
}

// PATCH /api/artist/self-exhibitions/[id] — 초대 수락/거절 (초대받은 작가가 호출)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profileId = await getArtistProfileId(session.userId);
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 400 });

  const { status } = await req.json().catch(() => ({}));
  if (!["confirmed", "declined"].includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const record = await prisma.exhibitionArtist.findFirst({
    where: { exhibitionId: params.id, artistId: profileId },
  });
  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await prisma.exhibitionArtist.update({
    where: { id: record.id },
    data: { status },
  });

  return NextResponse.json({ ok: true, record: updated });
}

// GET /api/artist/self-exhibitions/[id] — 특정 전시 상세 조회
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const exhibition = await prisma.exhibition.findUnique({
    where: { id: params.id },
    include: {
      space: true,
      curator: true,
      artists: {
        include: {
          artist: { select: { id: true, name: true, artistId: true, country: true, city: true, profileImage: true } },
        },
      },
    },
  });

  if (!exhibition) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ exhibition });
}
