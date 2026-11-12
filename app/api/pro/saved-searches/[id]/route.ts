import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { readSavedSearch, removeSavedSearch } from "@/lib/pro/privateStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const gate = proGate(req, "pro-saved-search-read", 60);
  if (isProGateResponse(gate)) return gate;
  try {
    const search = await readSavedSearch(gate.userId, params.id);
    if (!search) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ search }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    console.error("saved search read failed", error);
    return NextResponse.json({ error: "saved search failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const gate = proGate(req, "pro-saved-search-write");
  if (isProGateResponse(gate)) return gate;
  try {
    const deleted = await removeSavedSearch(gate.userId, params.id);
    if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    console.error("saved search delete failed", error);
    return NextResponse.json({ error: "saved search failed" }, { status: 500 });
  }
}
