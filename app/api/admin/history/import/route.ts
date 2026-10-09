import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/apiGuards";
import { mayPublishHistoryRecord } from "@/lib/history/policy";

export const dynamic = "force-dynamic";

// Staging gate only. This route never reads the pilot dataset and never publishes PILOT_ONLY rows.
export async function POST(req: Request) {
  const { error } = requireAdminSession();
  if (error) return error;
  const body = await req.json().catch(() => null);
  const allowed = mayPublishHistoryRecord({
    pilotOnly: Boolean(body?.pilotOnly) || body?.usageStatus === "PILOT_ONLY",
    usageStatus: typeof body?.usageStatus === "string" ? body.usageStatus : null,
    clearance: typeof body?.clearance === "string" ? body.clearance : null,
  });
  if (!allowed) {
    return NextResponse.json({ imported: false, error: "PUBLIC_BETA_CONTENT_GATE_BLOCKED" }, { status: 409 });
  }
  return NextResponse.json(
    { imported: false, error: "Approved records stay staged until a reviewed import is explicitly run." },
    { status: 409 },
  );
}
