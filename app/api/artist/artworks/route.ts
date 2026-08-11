import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rateLimit";
import { FREE_PLAN_LIMITS } from "@/lib/freePlan";
import { storeArtworkImage } from "@/lib/artworkStorage";
import { assignArtworkToSeries, deriveArtworkTitle } from "@/lib/artworkSeriesSync";
import { syncArtworkHashtags, loadHashtagsForArtworks } from "@/lib/artworkHashtags";
import { serializeArtwork } from "@/lib/artworkSerialize";
import { parsePostType } from "@/lib/artworkTypes";
import { syncExhibitionArtEvent } from "@/lib/artworkExhibitionSync";

export const dynamic = "force-dynamic";

const MAX_IMAGES_PER_POST = 5;

async function withHashtags<T extends { id: string }>(items: T[]) {
  const tagMap = await loadHashtagsForArtworks(items.map((i) => i.id));
  return items.map((item) => ({
    item,
    hashtags: tagMap.get(item.id) ?? [],
  }));
}

/** GET — list artworks for authenticated artist (newest first) */
export async function GET() {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const profile = await prisma.artistProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ artworks: [] });

  const artworks = await prisma.artwork.findMany({
    where: { artistId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      series: { select: { id: true, title: true } },
      images: { select: { url: true, position: true }, orderBy: { position: "asc" } },
    },
  });

  const tagged = await withHashtags(artworks);
  return NextResponse.json({
    artworks: tagged.map(({ item, hashtags }) => serializeArtwork(item as Parameters<typeof serializeArtwork>[0], hashtags)),
  });
}

/** POST — upload artwork (SNS-style) */
export async function POST(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const profile = await prisma.artistProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, genre: true },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "profile not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  // Multi-photo posts: imageUrls[] (first = cover). Single imageUrl kept for compat.
  const rawImageUrls: string[] = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  const imageUrl = rawImageUrls[0]?.trim() || String(body.imageUrl || body.imageUri || "").trim();
  const extraImageUrls = rawImageUrls.slice(1, MAX_IMAGES_PER_POST).map((v) => v.trim());
  const caption = typeof body.caption === "string" ? body.caption.trim() || null : null;
  const titleInput = typeof body.title === "string" ? body.title.trim() || null : null;
  const seriesIdInput = typeof body.seriesId === "string" ? body.seriesId : null;
  const postType = parsePostType(body.postType);
  const medium = typeof body.medium === "string" ? body.medium.trim() || null : profile.genre || null;
  const inPortfolio = body.inPortfolio === true;

  if (!imageUrl) {
    return NextResponse.json({ ok: false, error: "image required" }, { status: 400 });
  }

  const uploadRate = consumeRateLimit({
    key: `free-plan:artwork-upload:${session.userId}`,
    max: FREE_PLAN_LIMITS.maxArtworkUploadsPerDay,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!uploadRate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "free_plan_artwork_upload_daily_limit_reached",
        limit: FREE_PLAN_LIMITS.maxArtworkUploadsPerDay,
        resetAt: uploadRate.resetAt,
      },
      { status: 429 },
    );
  }

  const count = await prisma.artwork.count({ where: { artistId: profile.id } });
  if (count >= FREE_PLAN_LIMITS.maxArtworksPerArtist) {
    return NextResponse.json(
      {
        ok: false,
        error: "free_plan_artwork_limit_reached",
        limit: FREE_PLAN_LIMITS.maxArtworksPerArtist,
      },
      { status: 403 },
    );
  }

  const stored = await storeArtworkImage(session.userId, imageUrl);
  if (!stored.ok) {
    return NextResponse.json({ ok: false, error: stored.error }, { status: 400 });
  }

  const storedExtraUrls: string[] = [];
  for (const extra of extraImageUrls) {
    const storedExtra = await storeArtworkImage(session.userId, extra);
    if (!storedExtra.ok) {
      return NextResponse.json({ ok: false, error: storedExtra.error }, { status: 400 });
    }
    storedExtraUrls.push(storedExtra.url);
  }

  const title = deriveArtworkTitle(titleInput, caption);

  let seriesAssignment: {
    seriesId: string | null;
    seriesTitle: string | null;
    createdSeries: boolean;
  } = { seriesId: null, seriesTitle: null, createdSeries: false };

  if (postType === "work") {
    seriesAssignment = await assignArtworkToSeries(
      profile.id,
      title,
      caption,
      seriesIdInput,
    );
  }

  const artwork = await prisma.artwork.create({
    data: {
      artistId: profile.id,
      seriesId: seriesAssignment.seriesId,
      postType,
      title,
      caption,
      imageUrl: stored.url,
      medium,
      isPublic: true,
      inPortfolio,
      ...(storedExtraUrls.length > 0
        ? {
            images: {
              create: [stored.url, ...storedExtraUrls].map((url, position) => ({ url, position })),
            },
          }
        : {}),
    },
    include: {
      series: { select: { id: true, title: true } },
      images: { select: { url: true, position: true }, orderBy: { position: "asc" } },
    },
  });

  const hashtags = await syncArtworkHashtags(artwork.id, caption);

  if (postType === "exhibition") {
    await syncExhibitionArtEvent(profile.id, title, caption);
  }

  return NextResponse.json({
    ok: true,
    artwork: serializeArtwork(artwork, hashtags),
    seriesAssignment,
  });
}

/** PATCH — update artwork metadata */
export async function PATCH(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const profile = await prisma.artistProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "profile not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  // Portfolio reorder: { orderedIds: string[] } — index becomes portfolioOrder
  if (Array.isArray(body.orderedIds)) {
    const orderedIds = body.orderedIds.filter(
      (v: unknown): v is string => typeof v === "string" && v.trim().length > 0,
    );
    if (orderedIds.length === 0) {
      return NextResponse.json({ ok: false, error: "orderedIds required" }, { status: 400 });
    }
    const owned = await prisma.artwork.findMany({
      where: { id: { in: orderedIds }, artistId: profile.id },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((a: { id: string }) => a.id));
    await prisma.$transaction(
      orderedIds
        .filter((id: string) => ownedIds.has(id))
        .map((id: string, index: number) =>
          prisma.artwork.update({ where: { id }, data: { portfolioOrder: index } }),
        ),
    );
    return NextResponse.json({ ok: true, count: ownedIds.size });
  }

  // Batch portfolio toggle: { ids: string[], inPortfolio: boolean }
  if (Array.isArray(body.ids)) {
    if (typeof body.inPortfolio !== "boolean") {
      return NextResponse.json({ ok: false, error: "inPortfolio required" }, { status: 400 });
    }
    const ids = body.ids.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0);
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "ids required" }, { status: 400 });
    }
    const result = await prisma.artwork.updateMany({
      where: { id: { in: ids }, artistId: profile.id },
      data: { inPortfolio: body.inPortfolio },
    });
    return NextResponse.json({ ok: true, count: result.count });
  }

  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const existing = await prisma.artwork.findFirst({
    where: { id, artistId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const data: {
    title?: string | null;
    caption?: string | null;
    inPortfolio?: boolean;
    isPublic?: boolean;
    seriesId?: string | null;
    postType?: string;
  } = {};

  if (typeof body.title === "string") data.title = body.title.trim() || null;
  if (typeof body.caption === "string") data.caption = body.caption.trim() || null;
  if (typeof body.inPortfolio === "boolean") data.inPortfolio = body.inPortfolio;
  if (typeof body.isPublic === "boolean") data.isPublic = body.isPublic;
  if (body.postType) data.postType = parsePostType(body.postType);
  if (body.seriesId === null) data.seriesId = null;
  if (typeof body.seriesId === "string" && body.seriesId.trim()) {
    const series = await prisma.artworkSeries.findFirst({
      where: { id: body.seriesId.trim(), artistId: profile.id },
    });
    if (series) data.seriesId = series.id;
  }

  const artwork = await prisma.artwork.update({
    where: { id },
    data,
    include: {
      series: { select: { id: true, title: true } },
      images: { select: { url: true, position: true }, orderBy: { position: "asc" } },
    },
  });

  const hashtags =
    typeof body.caption === "string"
      ? await syncArtworkHashtags(artwork.id, artwork.caption)
      : (await loadHashtagsForArtworks([artwork.id])).get(artwork.id) ?? [];

  return NextResponse.json({ ok: true, artwork: serializeArtwork(artwork, hashtags) });
}

/** DELETE — remove artwork */
export async function DELETE(req: NextRequest) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const profile = await prisma.artistProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "profile not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const existing = await prisma.artwork.findFirst({
    where: { id, artistId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  await prisma.artwork.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
