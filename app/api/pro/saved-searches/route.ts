import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { createSavedSearch, listSavedSearches } from "@/lib/pro/privateStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = proGate(req, "pro-saved-search-read", 60);
  if (isProGateResponse(gate)) return gate;
  try {
    const items = await listSavedSearches(gate.userId);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    console.error("saved search list failed", error);
    return NextResponse.json({ error: "saved search failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = proGate(req, "pro-saved-search-write");
  if (isProGateResponse(gate)) return gate;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "unsupported_filters" }, { status: 400 });
  }
  const record = body as { name?: unknown; filters?: unknown };
  try {
    const result = await createSavedSearch(gate.userId, record.name, record.filters);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ search: result.search }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    console.error("saved search create failed", error);
    return NextResponse.json({ error: "saved search failed" }, { status: 500 });
  }
}
