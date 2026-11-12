import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiGuards";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { queryDiscovery } from "@/lib/pro/discoveryQuery";
import { isProDiscoveryEnabled } from "@/lib/pro/discoveryFlag";
import { parseDiscoveryRequest } from "@/lib/pro/discoveryPolicy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isProDiscoveryEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const limited = enforceRateLimit(req, "pro-discover", 60, 60_000);
  if (limited) return limited;

  const applied = parseDiscoveryRequest(new URL(req.url).searchParams);
  try {
    const outcome = await queryDiscovery(applied);
    return NextResponse.json(outcome, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isHistoryUnavailable(error)) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    console.error("pro discovery failed", error);
    return NextResponse.json({ error: "discovery failed" }, { status: 500 });
  }
}
