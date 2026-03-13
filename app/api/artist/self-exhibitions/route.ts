import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 내 ArtistProfile.id 조회 헬퍼
async function getArtistProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.artistProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

// GET: 내 자체 등록 전시 목록 조회
export async function GET() {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profileId = await getArtistProfileId(session.userId);
  if (!profileId) {
    return NextResponse.json({ exhibitions: [] });
  }

  const exhibitions = await prisma.exhibition.findMany({
    where: { createdBy: profileId },
    include: {
      space: true,
      curator: true,
      artists: {
        select: {
          id: true,
          artistId: true,
          status: true,
          artist: { select: { id: true, name: true, artistId: true, country: true, city: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ exhibitions });
}

// POST: 전시 신규 등록
export async function POST(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profileId = await getArtistProfileId(session.userId);
  if (!profileId) {
    return NextResponse.json({ error: "profile_required" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "title_required" }, { status: 400 });
  }

  const { title, startDate, endDate, city, country, description, isPublic,
    spaceName, spaceType, spaceWebsite,
    curatorName, curatorBio, curatorOrganization,
    collaboratorArtistIds } = body;

  const collabIds = Array.isArray(collaboratorArtistIds)
    ? collaboratorArtistIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
    : [];

  // Space upsert (이름이 있을 때만)
  let spaceId: string | undefined;
  if (spaceName?.trim()) {
    const space = await prisma.space.create({
      data: {
        name: spaceName.trim(),
        type: spaceType?.trim() || null,
        city: city?.trim() || null,
        country: country?.trim() || null,
        website: spaceWebsite?.trim() || null,
      },
    });
    spaceId = space.id;
  }

  // Curator create (이름이 있을 때만)
  let curatorId: string | undefined;
  if (curatorName?.trim()) {
    const curator = await prisma.curator.create({
      data: {
        name: curatorName.trim(),
        bio: curatorBio?.trim() || null,
        organization: curatorOrganization?.trim() || null,
      },
    });
    curatorId = curator.id;
  }

  const artistCreates: Array<{ artistId: string; status: string }> = [
    { artistId: profileId, status: "confirmed" },
  ];

  const seen = new Set<string>([profileId]);
  for (const id of collabIds) {
    if (seen.has(id)) continue;
    const exists = await prisma.artistProfile.findFirst({
      where: { OR: [{ id }, { artistId: id }] },
      select: { id: true },
    });
    if (exists && !seen.has(exists.id)) {
      seen.add(exists.id);
      artistCreates.push({ artistId: exists.id, status: "confirmed" });
    }
  }

  const exhibition = await prisma.exhibition.create({
    data: {
      title: title.trim(),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      city: city?.trim() || null,
      country: country?.trim() || null,
      description: description?.trim() || null,
      isPublic: !!isPublic,
      createdBy: profileId,
      spaceId: spaceId || null,
      curatorId: curatorId || null,
      artists: { create: artistCreates },
    },
    include: { space: true, curator: true, artists: true },
  });

  return NextResponse.json({ ok: true, exhibition });
}

// PATCH: 전시 수정
export async function PATCH(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profileId = await getArtistProfileId(session.userId);
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  const existing = await prisma.exhibition.findFirst({
    where: { id: body.id, createdBy: profileId },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { title, startDate, endDate, city, country, description, isPublic } = body;

  const exhibition = await prisma.exhibition.update({
    where: { id: body.id },
    data: {
      ...(title ? { title: title.trim() } : {}),
      startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
      endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
      city: city !== undefined ? (city?.trim() || null) : undefined,
      country: country !== undefined ? (country?.trim() || null) : undefined,
      description: description !== undefined ? (description?.trim() || null) : undefined,
      isPublic: isPublic !== undefined ? !!isPublic : undefined,
    },
    include: { space: true, curator: true, artists: true },
  });

  return NextResponse.json({ ok: true, exhibition });
}

// DELETE: 전시 삭제
export async function DELETE(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profileId = await getArtistProfileId(session.userId);
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 400 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  const existing = await prisma.exhibition.findFirst({
    where: { id, createdBy: profileId },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.exhibition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
