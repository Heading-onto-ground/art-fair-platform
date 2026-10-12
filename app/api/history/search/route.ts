import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiGuards";
import { searchDemandQuery } from "@/lib/history/identity";
import { searchArtists } from "@/lib/history/queries";
import { isHistoryUnavailable, isMissingHistorySchema } from "@/lib/history/schemaError";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "history-search", 60, 60_000);
  if (limited) return limited;
  const query = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const results = await searchArtists(query);
    if (results.length === 0) await recordMissingSearch(query);
    return NextResponse.json({ results, unavailable: false });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ results: [], unavailable: true });
    console.error("history search failed", error);
    return NextResponse.json({ error: "search failed" }, { status: 500 });
  }
}

async function recordMissingSearch(query: string) {
  const normalized = searchDemandQuery(query);
  if (!normalized) return;
  try {
    await prisma.historySignal.create({
      data: { name: "SEARCH_NO_RESULT", path: normalized },
    });
  } catch (error) {
    if (!isMissingHistorySchema(error)) console.error("search demand failed", error);
  }
}
