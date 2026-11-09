import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cronAuth";
import { expansionPolicy, EXPANSION_KILL_SWITCH } from "@/lib/history/expansionPolicy";
import { runExpansionWithStore } from "@/lib/history/expansionStore";
import { isHistoryUnavailable } from "@/lib/history/schemaError";
import { beginResearchWorkflow } from "@/lib/history/startResearchWorkflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * ROB History: daily graph-expansion scheduler.
 *
 * Selects a bounded number of research actions, starts durable workflows,
 * and returns. The daily unit is an investigation, not a new artist.
 * Crawling happens inside the workflows.
 * ROB_EXPANSION_ENABLED=false makes this route a safe no-op; visitor
 * Discovery and search are unaffected by that flag.
 */
async function handle(req: Request) {
  if (!isCronAuthorized(req, { allowAdminSession: false, allowDevWithoutSecret: false })) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const policy = expansionPolicy();
  if (!policy.enabled) {
    return NextResponse.json({ status: "DISABLED", killSwitch: EXPANSION_KILL_SWITCH, jobsStarted: 0 });
  }
  try {
    const run = await runExpansionWithStore({ mode: "SCHEDULED", policy, startWorkflow: beginResearchWorkflow });
    return NextResponse.json({
      status: run.status,
      runKey: run.runKey,
      pausedReason: run.summary.pausedReason,
      candidatesObserved: run.candidatesObserved,
      candidatesInserted: run.candidatesInserted,
      candidatesUpdated: run.candidatesUpdated,
      jobsStarted: run.jobsStarted,
      jobsReused: run.jobsReused,
      estimatedFetches: run.estimatedFetches,
      failureCount: run.failureCount,
      selected: run.summary.selected.map((row) => ({ name: row.displayName, action: row.action, score: row.score })),
    });
  } catch (error) {
    if (isHistoryUnavailable(error)) return NextResponse.json({ status: "UNAVAILABLE", jobsStarted: 0 }, { status: 503 });
    console.error("history expansion cron failed", error);
    return NextResponse.json({ status: "FAILED", jobsStarted: 0 }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
