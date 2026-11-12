import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { canonicalSavedFilter, toParsedDiscovery } from "@/lib/pro/privatePolicy";
import { markSavedSearchViewed, readSavedSearch } from "@/lib/pro/privateStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = proGate(req, "pro-saved-search-view");
  if (isProGateResponse(gate)) return gate;
  try {
    const search = await readSavedSearch(gate.userId, params.id);
    if (!search) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const filter = canonicalSavedFilter(toParsedDiscovery(search.filters));
    if (!filter) return NextResponse.json({ error: "unsupported_filters" }, { status: 400 });
    await markSavedSearchViewed(gate.userId, params.id, filter);
    return NextResponse.json({ viewed: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    console.error("saved search view failed", error);
    return NextResponse.json({ error: "saved search failed" }, { status: 500 });
  }
}
