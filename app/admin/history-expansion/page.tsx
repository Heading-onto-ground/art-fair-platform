import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminAuth";
import { EXPANSION_KILL_SWITCH } from "@/lib/history/expansionPolicy";
import { GRAPH_MILESTONE, graphDelta } from "@/lib/history/expansionGraphValue";
import { loadExpansionHealth, runExpansionWithStore } from "@/lib/history/expansionStore";
import type { ExpansionRunRecord } from "@/lib/history/expansionScheduler";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import ExpansionControls from "@/app/components/admin/ExpansionControls";

export const dynamic = "force-dynamic";

function dailySummary(health: Awaited<ReturnType<typeof loadExpansionHealth>>): string[] {
  const t = health.today;
  const graph = health.graph;
  const before = health.lastRun?.summary.graphBefore ?? null;
  const delta = before ? graphDelta(before, graph) : null;
  return [
    `ROB DAILY GRAPH EXPANSION — ${t.dayKey}`,
    `Daily unit: research action`,
    `Research actions started: ${t.workflowStarts}`,
    `Exhibitions added: ${t.newExhibitions}`,
    `Participation edges added: ${t.newParticipations}`,
    `Artist → Exhibition → Artist paths added: ${t.newSharedPairs}`,
    `New artists published: ${t.published}`,
    `Sparse artists enriched: ${t.expanded}`,
    `HISTORY_READY on the public graph: ${graph.historyReady}${delta ? ` (delta ${delta.historyReady})` : ""}`,
    `RICH_HISTORY on the public graph: ${graph.richHistory}${delta ? ` (delta ${delta.richHistory})` : ""}`,
    `Connected components: ${graph.connectedComponents}${delta ? ` (delta ${delta.connectedComponents})` : ""}`,
    `Needs review: ${t.needsReview}`,
    `No trusted source: ${t.noTrustedSource}`,
  ];
}

export default async function HistoryExpansionPage() {
  if (!getAdminSession()) redirect("/admin/login");
  let health: Awaited<ReturnType<typeof loadExpansionHealth>> | null = null;
  let preview: ExpansionRunRecord | null = null;
  let unavailable = false;
  try {
    health = await loadExpansionHealth();
    preview = await runExpansionWithStore({ mode: "DRY_RUN", policy: health.policy, startWorkflow: async () => null, fetchRoster: false });
  } catch (error) {
    unavailable = isMissingHistorySchema(error);
    if (!unavailable) console.error("history expansion health failed", error);
  }
  return (
    <main style={{ maxWidth: 880, margin: "40px auto", padding: "0 20px", fontFamily: "Georgia, serif" }}>
      <p><Link href="/admin">Admin</Link> · <Link href="/admin/history-health">History health</Link></p>
      <h1>Daily Graph Expansion</h1>
      <p>Internal operator view. Each day runs a bounded set of research actions. The useful result is a verified Artist → Exhibition → Artist path, not a new name. Autonomous research uses the same identity, source, participation, duplicate, space, and publication gates as visitor Discovery.</p>
      {unavailable || !health ? <p>Expansion tables are not available. Apply prisma/sql/add-artist-research-candidates.sql first.</p> : null}
      {health ? (
        <>
          <h2>State</h2>
          <p>
            {EXPANSION_KILL_SWITCH}: <strong>{health.policy.enabled ? "true" : "false"}</strong>.
          </p>
          <p>
            Circuit breaker: <strong>{health.paused ? `Open · ${health.paused}` : "Closed"}</strong>
          </p>
          <p>
            Data quality: {health.dataQuality.missingCanonicalName} artists missing canonical name. {health.dataQuality.sameNameRecords} same-name artist records require review.
          </p>
          <p>
            Daily research actions {health.policy.dailyResearchLimit}. Fetch budget {health.policy.dailyFetchLimit}. Candidate observations {health.policy.dailyCandidateLimit}/day, writes {health.policy.dailyCandidateWriteLimit}/day. Sparse share is recorded at {Math.round(health.policy.sparseShare * 100)}% and does not reserve slots ahead of a higher-scoring exhibition bridge. Child candidates per action {health.policy.maxChildCandidates}.
          </p>
          <h2>Graph growth</h2>
          <p>
            {health.graph.bridgePathCount} verified artist-to-artist paths. {health.graph.artistsDegreeAtLeast1} artists with a documented connection. {health.graph.artistsDegreeAtLeast3} artists with degree 3 or more. {health.graph.connectedComponents} components, largest {health.graph.largestComponent}. {health.graph.isolatedArtists} artists on the public graph are still alone.
          </p>
          <p>
            Public exhibitions {health.graph.publicExhibitionCount}. Participation edges {health.graph.participationCount}. Unresolved participant labels {health.graph.unresolvedParticipantCount}. Graph frontiers {health.frontierCount}. Actionable frontiers {health.actionableFrontierCount}.
          </p>
          <p>
            Density: ENTITY_ONLY {health.entityOnlyArtists}, LOW_DENSITY {health.graph.lowDensity}, HISTORY_READY {health.graph.historyReady}, RICH_HISTORY {health.graph.richHistory}. ArtistEntity rows {health.totalArtists}. Indexable artists {health.indexableArtists}. Candidates {health.candidateTotal}.
          </p>
          <p>
            Trusted archive pages discovered {(health.lastRun?.summary.archive?.families ?? []).reduce((sum, family) => sum + family.archivePagesFetched, 0)}. New exhibition research targets {health.lastRun?.summary.archive?.newTargets ?? 0}. Archive targets already seen {health.lastRun?.summary.archive?.knownSkipped ?? 0}. Exhibition URLs found {health.lastRun?.summary.archive?.exhibitionUrlsFound ?? 0}.
          </p>
          <p>
            Internal milestone, not a promise: {GRAPH_MILESTONE.usefulArtists} useful artists and {GRAPH_MILESTONE.verifiedExhibitionsMin}–{GRAPH_MILESTONE.verifiedExhibitionsMax} verified exhibitions, with most HISTORY_READY artists connected through a verified exhibition. Later: {GRAPH_MILESTONE.laterArtists} useful artists and {GRAPH_MILESTONE.laterExhibitions}+ exhibitions.
          </p>
          <ul>
            {Object.entries(health.candidates).sort().map(([status, count]) => (
              <li key={status}>{status} · {count}</li>
            ))}
          </ul>
          <h2>Daily summary</h2>
          <pre style={{ background: "#f6f3ee", padding: 12, whiteSpace: "pre-wrap" }}>{dailySummary(health).join("\n")}</pre>
          <p>Verified facts today {health.today.verifiedFacts}. Failed jobs today {health.today.failedJobs}. Workflow starts today {health.today.workflowStarts}.</p>
          <ExpansionControls enabled={health.policy.enabled} dailyLimit={health.policy.dailyResearchLimit} paused={health.paused} />
          <h2>Next research actions</h2>
          {preview ? (
            <>
              <p>Dry ranking. Nothing was created. Limit for this run {preview.summary.limitApplied} ({preview.summary.jobsStartedBefore} already started today, {preview.summary.openVisitorJobs} open visitor jobs).</p>
              <ol>
                {preview.summary.ranking.map((row) => (
                  <li key={row.candidateId}>
                    <strong>{row.displayName}</strong> · {row.researchReason} · {row.kind} · {row.sourceType} · score {row.score} · paths {row.potentialPaths}{row.connectsComponents ? " · component bridge" : ""}
                    {preview.summary.selected.some((item) => item.candidateId === row.candidateId) ? " · would run" : ""}
                    <br />
                    <small>{row.reasons.join("; ")} · expected sources: {row.expectedSourceFamilies.join(", ")} · links {row.existingArtistLinks}</small>
                  </li>
                ))}
              </ol>
              {preview.summary.skippedDuplicateIdentity.length > 0 ? <p>Skipped as another spelling of a selected identity: {preview.summary.skippedDuplicateIdentity.join(", ")}</p> : null}
            </>
          ) : <p>Preview unavailable.</p>}
          <h2>Last run</h2>
          {health.lastRun ? (
            <>
              <p>{health.lastRun.runKey} · {health.lastRun.mode} · {health.lastRun.status} · research actions {health.lastRun.jobsStarted} · reused {health.lastRun.jobsReused} · observed {health.lastRun.candidatesObserved} · estimated fetches {health.lastRun.estimatedFetches} · failures {health.lastRun.failureCount}</p>
              {(health.lastRun.summary.sourceFamilies ?? []).length > 0 ? (
                <p>Source families: {health.lastRun.summary.sourceFamilies.map((row) => `${row.family} ${row.investigations}`).join(" · ")}</p>
              ) : null}
              <ul>
                {health.lastRun.summary.selected.map((row) => (
                  <li key={row.candidateId}>{row.displayName} · {row.researchReason ?? row.sourceType} · {row.action}{row.jobId ? ` · job ${row.jobId}` : ""} · paths {row.potentialPaths ?? "n/a"} · {row.reasons.join("; ")}</li>
                ))}
              </ul>
              {health.lastRun.summary.errors.length > 0 ? <p>Errors: {health.lastRun.summary.errors.join(" | ")}</p> : null}
            </>
          ) : <p>No run recorded.</p>}
          <h2>Recent runs</h2>
          <ul>
            {health.recentRuns.length === 0 ? <li>None</li> : null}
            {health.recentRuns.map((run) => (
              <li key={run.runKey}>{run.runKey} · {run.mode} · {run.status} · jobs {run.jobsStarted} · observed {run.candidatesObserved}</li>
            ))}
          </ul>
          <h2>Needs review / no source / blocked</h2>
          <ul>
            {health.reviewCandidates.length === 0 ? <li>None</li> : null}
            {health.reviewCandidates.map((row) => (
              <li key={`${row.displayName}-${row.status}`}>{row.displayName} · {row.status} · {row.failureCode ?? "no code"} · eligible again {row.nextEligibleAt ?? "n/a"}</li>
            ))}
          </ul>
          <h2>Top real visitor missing queries</h2>
          <ul>
            {health.topMissingQueries.length === 0 ? <li>None</li> : null}
            {health.topMissingQueries.map((row) => (
              <li key={row.query}>{row.query} · {row.count} · last {row.lastSearched ?? "n/a"}</li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
