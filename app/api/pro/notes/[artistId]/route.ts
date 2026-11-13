import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { resolveArtistEntity } from "@/lib/pro/privateStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";
import { hasUnknownField, parseObject, validateNoteBody } from "@/lib/pro/shortlistPolicy";
import { artistPathKey, readArtistNote, removeArtistNote, writeArtistNote } from "@/lib/pro/shortlistStore";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export async function GET(req: Request, { params }: { params: { artistId: string } }) {
  const gate = proGate(req, "pro-note-read", 60);
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const key = artistPathKey(params.artistId);
  if (!key) return json({ error: "artist_required" }, 400);
  try {
    const artist = await resolveArtistEntity(key, key);
    if (!artist) return json({ error: "not_found" }, 404);
    const note = await readArtistNote(gate.userId, artist.id);
    if (!note) return json({ error: "not_found" }, 404);
    return json({ body: note.body, updatedAt: note.updatedAt.toISOString() });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("note read failed");
    return json({ error: "note failed" }, 500);
  }
}

export async function PUT(req: Request, { params }: { params: { artistId: string } }) {
  const gate = proGate(req, "pro-note-write");
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const key = artistPathKey(params.artistId);
  if (!key) return json({ error: "artist_required" }, 400);
  const record = parseObject(await req.json().catch(() => null));
  if (!record) return json({ error: "invalid_body" }, 400);
  if (hasUnknownField(record, ["body"])) return json({ error: "unknown_field" }, 400);
  const validated = validateNoteBody(record.body);
  if (!validated.ok) return json({ error: validated.error }, 400);
  try {
    const artist = await resolveArtistEntity(key, key);
    if (!artist) return json({ error: "not_found" }, 404);
    const saved = await writeArtistNote(gate.userId, artist.id, validated.body);
    if (!saved.ok) return json({ error: saved.error }, 400);
    return json({
      saved: true,
      created: saved.created,
      updatedAt: saved.row.updatedAt.toISOString(),
    });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("note save failed");
    return json({ error: "note failed" }, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { artistId: string } }) {
  const gate = proGate(req, "pro-note-write");
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const key = artistPathKey(params.artistId);
  if (!key) return json({ error: "artist_required" }, 400);
  try {
    const artist = await resolveArtistEntity(key, key);
    if (!artist) return json({ error: "not_found" }, 404);
    const result = await removeArtistNote(gate.userId, artist.id);
    if (result === "missing") return json({ error: "not_found" }, 404);
    return json({ deleted: true });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("note delete failed");
    return json({ error: "note failed" }, 500);
  }
}