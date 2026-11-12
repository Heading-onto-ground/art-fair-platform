import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { removeArtistWatch, resolveArtistEntity } from "@/lib/pro/privateStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: { artistId: string } }) {
  const gate = proGate(req, "pro-watchlist-write");
  if (isProGateResponse(gate)) return gate;
  const key = params.artistId?.trim();
  if (!key) return NextResponse.json({ error: "artist_required" }, { status: 400 });
  try {
    const artist = await resolveArtistEntity(key, key);
    const artistEntityId = artist?.id ?? key;
    await removeArtistWatch(gate.userId, artistEntityId);
    return NextResponse.json({ watching: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    console.error("watch delete failed", error);
    return NextResponse.json({ error: "watch failed" }, { status: 500 });
  }
}
