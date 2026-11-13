import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { resolveArtistEntity } from "@/lib/pro/privateStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";
import { hasUnknownField, isShortlistStatus, parseObject } from "@/lib/pro/shortlistPolicy";
import { artistPathKey, removeArtistShortlist, setShortlistStatus } from "@/lib/pro/shortlistStore";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

async function ownedArtist(key: string) {
  if (!key) return null;
  return resolveArtistEntity(key, key);
}

export async function PATCH(req: Request, { params }: { params: { artistId: string } }) {
  const gate = proGate(req, "pro-shortlist-write");
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const key = artistPathKey(params.artistId);
  if (!key) return json({ error: "artist_required" }, 400);
  const record = parseObject(await req.json().catch(() => null));
  if (!record) return json({ error: "invalid_body" }, 400);
  if (hasUnknownField(record, ["status"])) return json({ error: "unknown_field" }, 400);
  if (!isShortlistStatus(record.status)) return json({ error: "invalid_status" }, 400);
  try {
    const artist = await ownedArtist(key);
    if (!artist) return json({ error: "not_found" }, 404);
    const result = await setShortlistStatus(gate.userId, artist.id, record.status);
    if (!result.ok) return json({ error: result.error }, result.error === "not_found" ? 404 : 400);
    return json({ status: result.row.status, artistEntityId: artist.id });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("shortlist status failed");
    return json({ error: "shortlist failed" }, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { artistId: string } }) {
  const gate = proGate(req, "pro-shortlist-write");
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const key = artistPathKey(params.artistId);
  if (!key) return json({ error: "artist_required" }, 400);
  try {
    const artist = await ownedArtist(key);
    if (!artist) return json({ error: "not_found" }, 404);
    const result = await removeArtistShortlist(gate.userId, artist.id);
    if (result === "missing") return json({ error: "not_found" }, 404);
    return json({ shortlisted: false });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("shortlist delete failed");
    return json({ error: "shortlist failed" }, 500);
  }
}
