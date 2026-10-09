import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiGuards";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { searchArtists } from "@/lib/history/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "history-search", 60, 60_000);
  if (limited) return limited;
  const query = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const results = await searchArtists(query);
    return NextResponse.json({ results, unavailable: false });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ results: [], unavailable: true });
    console.error("history search failed", error);
    return NextResponse.json({ error: "search failed" }, { status: 500 });
  }
}
