import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { hasUnknownField, parseObject } from "@/lib/pro/activityAlertPolicy";
import { markAllAlertsRead } from "@/lib/pro/activityAlertStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export async function POST(req: Request) {
  const gate = proGate(req, "pro-alerts-write");
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const record = parseObject(await req.json().catch(() => ({})));
  if (!record) return json({ error: "invalid_body" }, 400);
  if (hasUnknownField(record, [])) return json({ error: "unknown_field" }, 400);
  try {
    const updated = await markAllAlertsRead(gate.userId);
    return json({ updated });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("activity alert read-all failed");
    return json({ error: "alerts failed" }, 500);
  }
}
