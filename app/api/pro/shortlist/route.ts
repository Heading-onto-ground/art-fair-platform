import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { resolveArtistEntity } from "@/lib/pro/privateStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";
import { hasUnknownField, parseObject, SHORTLIST_ITEM_KEYS } from "@/lib/pro/shortlistPolicy";
import { addArtistShortlist, listShortlistPage, type ShortlistListItem } from "@/lib/pro/shortlistStore";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

function shortlistResponseItem(item: ShortlistListItem) {
  const response: Record<(typeof SHORTLIST_ITEM_KEYS)[number], unknown> = {
    id: item.id,
    artistEntityId: item.artistEntityId,
    slug: item.slug,
    canonicalName: item.canonicalName,
    nativeName: item.nativeName,
    status: item.status,
    exhibitionCount: item.exhibitionCount,
    latestActivityLabel: item.latestActivityLabel,
    latestExhibitionTitle: item.latestExhibitionTitle,
    spaces: item.spaces,
    notePreview: item.notePreview,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    available: item.available,
  };
  return response;
}

export async function GET(req: Request) {
  const gate = proGate(req, "pro-shortlist-read", 60);
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const cursor = new URL(req.url).searchParams.get("cursor");
  try {
    const page = await listShortlistPage(gate.userId, cursor && cursor.trim() ? cursor.trim() : null);
    if (!page.ok) return json({ error: page.error }, 400);
    return json({ items: page.items.map(shortlistResponseItem), nextCursor: page.nextCursor });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("shortlist read failed");
    return json({ error: "shortlist failed" }, 500);
  }
}

export async function POST(req: Request) {
  const gate = proGate(req, "pro-shortlist-write");
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const record = parseObject(await req.json().catch(() => null));
  if (!record) return json({ error: "invalid_body" }, 400);
  if (hasUnknownField(record, ["artistEntityId"])) return json({ error: "unknown_field" }, 400);
  const artistEntityId = typeof record.artistEntityId === "string" ? record.artistEntityId.trim() : "";
  if (!artistEntityId) return json({ error: "artist_required" }, 400);
  try {
    const artist = await resolveArtistEntity(artistEntityId, null);
    if (!artist) return json({ error: "not_found" }, 404);
    const result = await addArtistShortlist(gate.userId, artist.id);
    return json({
      shortlisted: true,
      created: result.created,
      artistEntityId: artist.id,
      slug: artist.slug,
      status: result.row.status,
    });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("shortlist create failed");
    return json({ error: "shortlist failed" }, 500);
  }
}
