import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { hasUnknownField, parseObject } from "@/lib/pro/activityAlertPolicy";
import { markAlertRead } from "@/lib/pro/activityAlertStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = proGate(req, "pro-alerts-write");
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const record = parseObject(await req.json().catch(() => ({})));
  if (!record) return json({ error: "invalid_body" }, 400);
  if (hasUnknownField(record, [])) return json({ error: "unknown_field" }, 400);
  const alertId = params.id?.trim() ?? "";
  if (!alertId) return json({ error: "not_found" }, 404);
  try {
    const updated = await markAlertRead(gate.userId, alertId);
    if (!updated) return json({ error: "not_found" }, 404);
    return json({ readAt: updated.readAt.toISOString() });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("activity alert read failed");
    return json({ error: "alerts failed" }, 500);
  }
}
