import { NextResponse } from "next/server";
import { enforceRateLimit, requireAdminSession } from "@/lib/apiGuards";
import { expansionPolicy, MANUAL_BATCH_MAX } from "@/lib/history/expansionPolicy";
import { loadExpansionHealth, runExpansionWithStore } from "@/lib/history/expansionStore";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { beginResearchWorkflow } from "@/lib/history/startResearchWorkflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function clampLimit(value: unknown, max: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return Math.min(3, max);
  return Math.min(Math.trunc(parsed), max);
}

/** Operator preview. Ranks candidates and shows what would run. Creates no job and writes no row. */
export async function GET(req: Request) {
  const { error } = requireAdminSession();
  if (error) return error;
  const limited = enforceRateLimit(req, "history-expansion-preview", 30, 10 * 60_000);
  if (limited) return limited;
  const policy = expansionPolicy();
  const limit = clampLimit(new URL(req.url).searchParams.get("limit"), 20);
  try {
    const [health, preview] = await Promise.all([
      loadExpansionHealth(),
      runExpansionWithStore({ mode: "DRY_RUN", limit, policy, startWorkflow: async () => null, fetchRoster: false }),
    ]);
    return NextResponse.json({ ok: true, health, preview: { ranking: preview.summary.ranking, selected: preview.summary.selected, limitApplied: preview.summary.limitApplied, streams: preview.summary.streams, skippedDuplicateIdentity: preview.summary.skippedDuplicateIdentity, estimatedFetches: preview.estimatedFetches } });
  } catch (err) {
    if (isHistoryUnavailable(err)) return NextResponse.json({ ok: false, unavailable: true }, { status: 503 });
    console.error("history expansion preview failed", err);
    return NextResponse.json({ ok: false, error: "preview failed" }, { status: 500 });
  }
}

/**
 * Authorized manual batch. Bounded by MANUAL_BATCH_MAX and by the daily
 * research limit; today's earlier starts count against the same budget.
 * The body must carry confirm: "RUN". There is no public button for this.
 */
export async function POST(req: Request) {
  const { error } = requireAdminSession();
  if (error) return error;
  const limited = enforceRateLimit(req, "history-expansion-run", 3, 60 * 60_000);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  if (!body || body.confirm !== "RUN") return NextResponse.json({ ok: false, error: "confirm" }, { status: 400 });
  const policy = expansionPolicy();
  const limit = clampLimit(body.limit, Math.min(MANUAL_BATCH_MAX, policy.dailyResearchLimit));
  try {
    const run = await runExpansionWithStore({ mode: "MANUAL", limit, policy, startWorkflow: beginResearchWorkflow });
    return NextResponse.json({ ok: true, run });
  } catch (err) {
    if (isHistoryUnavailable(err)) return NextResponse.json({ ok: false, unavailable: true }, { status: 503 });
    console.error("history expansion manual run failed", err);
    return NextResponse.json({ ok: false, error: "run failed" }, { status: 500 });
  }
}
