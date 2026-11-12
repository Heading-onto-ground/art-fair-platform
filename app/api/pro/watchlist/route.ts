import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { addArtistWatch, listArtistWatches, resolveArtistEntity } from "@/lib/pro/privateStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = proGate(req, "pro-watchlist-read", 60);
  if (isProGateResponse(gate)) return gate;
  try {
    const items = (await listArtistWatches(gate.userId)).map((item) => ({
      id: item.id,
      artistEntityId: item.artistEntityId,
      slug: item.slug,
      canonicalName: item.canonicalName,
      nativeName: item.nativeName,
      exhibitionCount: item.exhibitionCount,
      latestActivityLabel: item.latestActivityLabel,
      latestExhibitionTitle: item.latestExhibitionTitle,
      watchedAt: item.watchedAt,
      available: item.available,
    }));
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    console.error("watchlist read failed", error);
    return NextResponse.json({ error: "watchlist failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = proGate(req, "pro-watchlist-write");
  if (isProGateResponse(gate)) return gate;
  const body = await req.json().catch(() => null);
  const artistEntityId = body && typeof body.artistEntityId === "string" ? body.artistEntityId.trim() : null;
  const slug = body && typeof body.slug === "string" ? body.slug.trim() : null;
  if (!artistEntityId && !slug) return NextResponse.json({ error: "artist_required" }, { status: 400 });
  try {
    const artist = await resolveArtistEntity(artistEntityId, slug);
    if (!artist) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const result = await addArtistWatch(gate.userId, artist.id);
    return NextResponse.json(
      { watching: true, created: result.created, artistEntityId: artist.id, slug: artist.slug },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    console.error("watch create failed", error);
    return NextResponse.json({ error: "watch failed" }, { status: 500 });
  }
}
