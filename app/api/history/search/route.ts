import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiGuards";
import { historySearchBody } from "@/lib/history/searchFlow";
import { searchArtists } from "@/lib/history/queries";
import { isHistoryUnavailable } from "@/lib/history/schemaError";

export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "history-search", 60, 60_000);
  if (limited) return limited;
  const query = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const results = await searchArtists(query);
    return NextResponse.json(historySearchBody(results));
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ results: [], unavailable: true });
    console.error("history search failed", error);
    return NextResponse.json({ error: "search failed" }, { status: 500 });
  }
}
