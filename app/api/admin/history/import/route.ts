import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/apiGuards";
import { selectiveImportDecision, selectiveImportLog } from "@/lib/history/policy";

export const dynamic = "force-dynamic";

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

// Selective gate only. This route never reads the pilot dataset and never writes a row.
export async function POST(req: Request) {
  const { error } = requireAdminSession();
  if (error) return error;
  const body = await req.json().catch(() => null);
  const requestedIds = idList(body?.recordIds);
  const decision = selectiveImportDecision({
    usageStatus: typeof body?.usageStatus === "string" ? body.usageStatus : body?.pilotOnly ? "PILOT_ONLY" : null,
    reviewDecision: typeof body?.reviewDecision === "string" ? body.reviewDecision : null,
    requestedIds,
    approvedIds: idList(body?.approvedRecordIds),
  });
  if (!decision.ok) {
    return NextResponse.json({ imported: false, error: decision.reason }, { status: 409 });
  }
  const logs = requestedIds.map((pilotRecordId) =>
    selectiveImportLog({
      pilotRecordId,
      productionEntityId: null,
      importedBy: "admin-history-import",
      at: null,
    }),
  );
  return NextResponse.json(
    { imported: false, error: "PUBLIC_BETA_DATABASE_GATE_BLOCKED", logs },
    { status: 409 },
  );
}
