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
    include: { series: { select: { id: true, title: true } } },
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
  const imageUrl = String(body.imageUrl || body.imageUri || "").trim();
  const caption = typeof body.caption === "string" ? body.caption.trim() || null : null;
  const titleInput = typeof body.title === "string" ? body.title.trim() || null : null;
  const seriesIdInput = typeof body.seriesId === "string" ? body.seriesId : null;
  const postType = parsePostType(body.postType);
  const medium = typeof body.medium === "string" ? body.medium.trim() || null : profile.genre || null;

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
      inPortfolio: false,
    },
    include: { series: { select: { id: true, title: true } } },
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
    include: { series: { select: { id: true, title: true } } },
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
