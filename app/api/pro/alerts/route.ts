import { NextResponse } from "next/server";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { ALERT_ITEM_KEYS } from "@/lib/pro/activityAlertPolicy";
import { listActivityAlerts, type AlertListItem } from "@/lib/pro/activityAlertStore";
import { isProGateResponse, proGate } from "@/lib/pro/proGate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

function alertResponseItem(item: AlertListItem) {
  const response: Record<(typeof ALERT_ITEM_KEYS)[number], unknown> = {
    id: item.id,
    artistEntityId: item.artistEntityId,
    artistSlug: item.artistSlug,
    artistName: item.artistName,
    exhibitionId: item.exhibitionId,
    exhibitionTitle: item.exhibitionTitle,
    spaceName: item.spaceName,
    eventDateLabel: item.eventDateLabel,
    message: item.message,
    isHistoricalBackfill: item.isHistoricalBackfill,
    recordedAt: item.recordedAt,
    createdAt: item.createdAt,
    readAt: item.readAt,
    href: item.href,
  };
  return response;
}

export async function GET(req: Request) {
  const gate = proGate(req, "pro-alerts-read", 60);
  if (isProGateResponse(gate)) {
    gate.headers.set("Cache-Control", "private, no-store");
    return gate;
  }
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const unreadOnly = url.searchParams.get("unread") === "1";
  try {
    const page = await listActivityAlerts(gate.userId, cursor && cursor.trim() ? cursor.trim() : null, unreadOnly);
    if (!page.ok) return json({ error: page.error }, 400);
    return json({
      items: page.items.map(alertResponseItem),
      nextCursor: page.nextCursor,
      unreadCount: page.unreadCount,
    });
  } catch (error) {
    if (isHistoryUnavailable(error)) return json({ error: "unavailable" }, 503);
    console.error("activity alert list failed");
    return json({ error: "alerts failed" }, 500);
  }
}
