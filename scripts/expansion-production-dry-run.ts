/**
 * Read-only production ranking for Global Artist Expansion.
 * Opens one transaction with BEGIN READ ONLY, runs SELECT only, then ROLLBACK.
 * It does not insert candidates, jobs, exhibitions, or artists.
 */
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { countsAsFrontierDemand, DEMAND_SEPARATION_AT } from "@/lib/history/demandQuality";
import {
  demandObservations,
  galleryRosterObservations,
  isExpansionFixtureLabel,
  mergeObservations,
  sparseArtistObservations,
  unresolvedObservations,
  type ExpansionGraph,
} from "@/lib/history/expansionCandidates";
import { classifyRosterEntries, parseArtistRoster, rosterStreamName, TRUSTED_ARTIST_ROSTERS } from "@/lib/history/artistRosters";
import { fetchTrustedDocument } from "@/lib/history/trustedCrawl";
import { exhibitionFrontiers } from "@/lib/history/exhibitionFrontier";
import { GRAPH_MILESTONE, graphHealth } from "@/lib/history/expansionGraphValue";
import { expansionPolicyFrom, parseBooleanFlag } from "@/lib/history/expansionPolicy";
import { GRAPH_RANK_WEIGHTS, rankCandidates, selectDailyBatch } from "@/lib/history/expansionRank";
import { resolveArtistSlug } from "@/lib/history/identity";

const FIXTURES = ["ada painter", "canary painter", "pending check name", "zzzz no artist"];

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const path = process.env.ROB_ENV_FILE ?? "C:/Users/USER/Documents/art-fair-platform/.env.local";
  const line = readFileSync(path, "utf8").split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL missing");
  let value = line.slice("DATABASE_URL=".length).trim().replace(/\\n$/, "");
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

type PublicRow = {
  id: string;
  title: string;
  space: string | null;
  startYear: number | null;
  slug: string | null;
  canonicalName: string | null;
  nativeName: string | null;
  alias: string | null;
  sourceUrl: string | null;
};

async function main() {
  const client = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query("BEGIN READ ONLY");
  try {
    const counts = await client.query<{ artists: string; exhibitions: string; participations: string }>(`
      SELECT
        (SELECT COUNT(*) FROM "ArtistEntity")::text AS artists,
        (SELECT COUNT(*) FROM "Exhibition")::text AS exhibitions,
        (SELECT COUNT(*) FROM "HistoryParticipation")::text AS participations
    `);
    const publicRows = await client.query<PublicRow>(`
      SELECT ex.id, ex.title, sp.name AS space, meta."startYear",
             artist.slug, artist."canonicalName", artist."nativeName", alias.label AS alias,
             source.url AS "sourceUrl"
      FROM "Exhibition" ex
      LEFT JOIN "Space" sp ON sp.id = ex."spaceId"
      LEFT JOIN "ExhibitionHistoryMeta" meta ON meta."exhibitionId" = ex.id
      LEFT JOIN "HistoryParticipation" hp ON hp."exhibitionId" = ex.id
      LEFT JOIN "ArtistEntity" artist ON artist.id = hp."artistEntityId"
      LEFT JOIN "ArtistAlias" alias ON alias."artistEntityId" = artist.id
      LEFT JOIN LATERAL (
        SELECT hs.url
        FROM "ExhibitionSource" es
        JOIN "HistorySource" hs ON hs.id = es."sourceId"
        WHERE es."exhibitionId" = ex.id
        LIMIT 1
      ) source ON true
      WHERE ex."isPublic" = true
        AND (
          (meta."exhibitionId" IS NULL AND ex."createdBy" IS NOT NULL)
          OR (
            meta."publicationStatus" = 'PUBLIC'
            AND meta."sourceClearance" <> 'REJECTED'
            AND (
              meta.origin IN ('ARTIST_SUBMITTED', 'GALLERY_SUBMITTED', 'INSTITUTION_SUBMITTED', 'LEGACY_FIRST_PARTY')
              OR (meta.origin = 'ROB_RESEARCHED' AND meta."sourceClearance" = 'APPROVED')
            )
          )
          OR (
            meta."publicationStatus" = 'PUBLIC'
            AND meta.origin = 'ROB_RESEARCHED'
            AND meta."sourceClearance" <> 'REJECTED'
            AND EXISTS (
              SELECT 1
              FROM "ExhibitionSource" es
              JOIN "HistorySource" hs ON hs.id = es."sourceId"
              WHERE es."exhibitionId" = ex.id
                AND hs."internalUseDecision" IN ('ALLOW_LIMITED', 'FACTUAL_USE_OK')
                AND hs."contentScope" = 'FACTUAL_METADATA_ONLY'
            )
          )
        )
    `);
    const unresolvedRows = await client.query<{ label: string; exhibitionId: string; title: string; slug: string | null; sourceUrl: string | null }>(`
      SELECT names.label, names."exhibitionId", ex.title, artist.slug, source.url AS "sourceUrl"
      FROM "HistoryUnresolvedName" names
      JOIN "Exhibition" ex ON ex.id = names."exhibitionId"
      LEFT JOIN "HistoryParticipation" hp ON hp."exhibitionId" = ex.id
      LEFT JOIN "ArtistEntity" artist ON artist.id = hp."artistEntityId"
      LEFT JOIN LATERAL (
        SELECT hs.url
        FROM "ExhibitionSource" es
        JOIN "HistorySource" hs ON hs.id = es."sourceId"
        WHERE es."exhibitionId" = ex.id
        LIMIT 1
      ) source ON true
      WHERE names.status = 'UNRESOLVED_PARTICIPANT'
    `);
    const demandRows = await client.query<{ path: string | null; count: number; lastSearched: Date | null }>(
      `SELECT path, COUNT(*)::int AS count, MAX("createdAt") AS "lastSearched"
       FROM "HistorySignal"
       WHERE name = 'SEARCH_NO_RESULT' AND "createdAt" >= $1
       GROUP BY path`,
      [new Date(DEMAND_SEPARATION_AT)],
    );
    const entityRows = await client.query<{ slug: string; canonicalName: string; nativeName: string | null; alias: string | null }>(`
      SELECT artist.slug, artist."canonicalName", artist."nativeName", alias.label AS alias
      FROM "ArtistEntity" artist
      LEFT JOIN "ArtistAlias" alias ON alias."artistEntityId" = artist.id
    `);
    const jobRows = await client.query<{ normalizedQuery: string; status: string; stage: string }>(`
      SELECT "normalizedQuery", status, stage FROM "ResearchJob"
    `);

    const artists = new Map<string, ExpansionGraph["artists"][number]>();
    const exhibitions = new Map<string, ExpansionGraph["exhibitions"][number]>();
    for (const row of publicRows.rows) {
      const exhibition = exhibitions.get(row.id) ?? { id: row.id, title: row.title, year: row.startYear, space: row.space, artistSlugs: [] };
      if (row.slug && !exhibition.artistSlugs.includes(row.slug)) exhibition.artistSlugs.push(row.slug);
      exhibitions.set(row.id, exhibition);
      if (!row.slug) continue;
      const artist = artists.get(row.slug) ?? { slug: row.slug, labels: [], exhibitionIds: [] };
      for (const label of [row.canonicalName, row.nativeName, row.alias]) {
        if (label && !artist.labels.includes(label)) artist.labels.push(label);
      }
      if (!artist.exhibitionIds.includes(row.id)) artist.exhibitionIds.push(row.id);
      artists.set(row.slug, artist);
    }
    const unresolvedGrouped = new Map<string, ExpansionGraph["unresolved"][number]>();
    for (const row of unresolvedRows.rows) {
      const key = `${row.exhibitionId}:${row.label}`;
      const current = unresolvedGrouped.get(key) ?? {
        label: row.label,
        exhibitionId: row.exhibitionId,
        exhibitionTitle: row.title,
        artistSlugs: [],
        sourceUrl: row.sourceUrl,
      };
      if (row.slug && !current.artistSlugs.includes(row.slug)) current.artistSlugs.push(row.slug);
      unresolvedGrouped.set(key, current);
    }
    const graph: ExpansionGraph = {
      artists: [...artists.values()],
      exhibitions: [...exhibitions.values()],
      unresolved: [...unresolvedGrouped.values()],
    };
    const names = new Map<string, { slug: string; labels: string[] }>();
    for (const row of entityRows.rows) {
      const current = names.get(row.slug) ?? { slug: row.slug, labels: [] };
      for (const label of [row.canonicalName, row.nativeName, row.alias]) {
        if (label && !current.labels.includes(label)) current.labels.push(label);
      }
      names.set(row.slug, current);
    }
    const allNames = [...names.values()];
    const demand = demandRows.rows
      .filter((row) => row.path && countsAsFrontierDemand({ name: "SEARCH_NO_RESULT", createdAt: row.lastSearched?.toISOString() ?? DEMAND_SEPARATION_AT, query: row.path }))
      .map((row) => ({ query: row.path as string, count: row.count, lastSearched: row.lastSearched?.toISOString() ?? null }));
    const seenAt = new Date().toISOString();
    const observations = [
      ...demandObservations(demand, graph, seenAt),
      ...unresolvedObservations(graph, seenAt),
      ...sparseArtistObservations(graph, demand, seenAt),
    ];
    const rosterErrors: string[] = [];
    const rosterAudit: {
      stream: string;
      host: string;
      indexUrl: string;
      blocked: string | null;
      bytes: number;
      adapter: string;
      names: number;
      profileUrls: number;
      existing: number;
      candidates: number;
      review: number;
      candidateNames: string[];
      reviewNames: { name: string; qualifier: string | null }[];
      existingNames: { name: string; slug: string }[];
    }[] = [];
    for (const roster of TRUSTED_ARTIST_ROSTERS) {
      if (!roster.enabled) continue;
      const page = await fetchTrustedDocument(roster.indexUrl, { timeoutMs: 12_000 });
      const html = page.html ?? "";
      if (page.blocked || !html) {
        rosterErrors.push(`${roster.sourceName}: ${page.blocked ?? "empty"}`);
        rosterAudit.push({
          stream: rosterStreamName(roster.adapter),
          host: roster.host,
          indexUrl: roster.indexUrl,
          blocked: page.blocked ?? "empty",
          bytes: 0,
          adapter: roster.adapter,
          names: 0,
          profileUrls: 0,
          existing: 0,
          candidates: 0,
          review: 0,
          candidateNames: [],
          reviewNames: [],
          existingNames: [],
        });
        continue;
      }
      const parsed = parseArtistRoster(html, roster);
      const classified = classifyRosterEntries(parsed, allNames);
      rosterAudit.push({
        stream: rosterStreamName(roster.adapter),
        host: page.host,
        indexUrl: roster.indexUrl,
        blocked: null,
        bytes: html.length,
        adapter: roster.adapter,
        names: parsed.length,
        profileUrls: parsed.filter((row) => row.profileUrl).length,
        existing: classified.existing.length,
        candidates: classified.candidates.length,
        review: classified.review.length,
        candidateNames: classified.candidates.map((row) => row.displayName),
        reviewNames: classified.review.map((row) => ({ name: row.displayName, qualifier: row.rosterQualifier })),
        existingNames: classified.existing.map((row) => ({ name: row.entry.displayName, slug: row.artistSlug })),
      });
      observations.push(...galleryRosterObservations({ html, indexUrl: roster.indexUrl, sourceName: roster.sourceName, graph, seenAt }));
    }
    const contaminated = observations.filter((row) => isExpansionFixtureLabel(row.label) || FIXTURES.some((name) => row.label.toLowerCase().includes(name)));
    const merged = mergeObservations({
      existing: [],
      observations,
      now: seenAt,
      observationLimit: 100,
      writeLimit: 50,
    });
    const leaked = merged.rows.filter((row) => isExpansionFixtureLabel(row.displayName));
    const ranked = rankCandidates({ candidates: merged.rows, graph, now: new Date() });
    const policy = expansionPolicyFrom({});
    const batch = selectDailyBatch({
      ranked,
      researchLimit: policy.dailyResearchLimit,
      sparseShare: policy.sparseShare,
      fetchLimit: policy.dailyFetchLimit,
    });
    const jobs = new Map<string, { status: string; stage: string }[]>();
    for (const job of jobRows.rows) {
      const list = jobs.get(job.normalizedQuery) ?? [];
      list.push({ status: job.status, stage: job.stage });
      jobs.set(job.normalizedQuery, list);
    }
    const view = ranked.slice(0, 50).map((row) => {
      const candidate = row.candidate;
      const artistSlug = resolveArtistSlug(candidate.displayName, allNames);
      const jobMatch = jobs.get(candidate.normalizedName) ?? [];
      let classification = "READY_FOR_RESEARCH";
      if (isExpansionFixtureLabel(candidate.displayName) || candidate.payload.labelClass !== "PERSON_LIKE") classification = "INVALID";
      else if (artistSlug || candidate.payload.existingArtistSlug) classification = "EXISTING_ARTIST";
      else if (jobMatch.length > 0) classification = "EXISTING_JOB";
      else if (candidate.payload.sourceHints.length > 0 && candidate.demandCount === 0 && candidate.payload.unresolvedOccurrences === 0) classification = "TRUSTED_SOURCE_HINT_ONLY";
      else if (candidate.demandCount <= 1 && candidate.payload.unresolvedOccurrences === 0 && candidate.payload.sourceHints.length === 0 && candidate.payload.sharedExistingArtists.length === 0) classification = "IDENTITY_PRECHECK_NEEDED";
      else if (candidate.payload.labelClass !== "PERSON_LIKE") classification = "AMBIGUOUS";
      return {
        rank: row.rank,
        displayName: candidate.displayName,
        normalizedName: candidate.normalizedName,
        source: candidate.sourceType,
        sourceInstitution: candidate.payload.provenance.find((item) => item.viaInstitution)?.viaInstitution ?? null,
        sourceFamily: candidate.sourceHost,
        classification,
        demandCount: candidate.demandCount,
        unresolvedCount: candidate.payload.unresolvedOccurrences,
        trustedSourceHints: candidate.payload.sourceHints.map(hostOf).filter(Boolean),
        graphAdjacency: candidate.payload.sharedExistingArtists,
        bridgePotential: candidate.payload.sharedExistingArtists.length,
        artistEntityMatch: artistSlug ?? candidate.payload.existingArtistSlug,
        researchJobMatch: jobMatch,
        score: row.score,
        reasons: row.reasons,
      };
    });
    const findRank = (name: string) => ranked.find((row) => row.candidate.normalizedName === name)?.rank ?? null;
    const safety = await client.query<{ mismatch: number; fixtures: number }>(`
      SELECT
        (SELECT COUNT(*)::int FROM "ArtistResearchCandidate" c
          JOIN "ResearchJob" j ON j.id = c."researchJobId"
          WHERE c.status = 'RESEARCHING' AND j.stage = 'DONE') AS mismatch,
        (SELECT COUNT(*)::int FROM "ArtistResearchCandidate"
          WHERE lower("displayName") IN ('ada painter', 'canary painter', 'pending check name', 'zzzz no artist')
             OR lower("displayName") LIKE 'canary painter %') AS fixtures
    `);
    const describe = (row: (typeof ranked)[number]) => ({
      rank: row.rank,
      target: row.candidate.displayName,
      candidateType: row.candidate.sourceType,
      reason: row.researchReason,
      priority: row.score,
      sourceFamily: row.candidate.sourceHost,
      existingOrNew: row.kind,
      knownExhibitions: row.candidate.payload.exhibitionCount,
      potentialExistingArtistLinks: row.bridge.existingArtistLinks,
      estimatedGraphBridgeGain: row.bridge.potentialPaths,
      connectsComponents: row.bridge.connectsComponents,
      visitorDemand: row.candidate.demandCount,
      cooldown: row.candidate.nextEligibleAt,
      trustedSourceHints: row.expectedSourceFamilies,
      why: row.reasons,
    });
    const envPath = process.env.ROB_ENV_FILE ?? "C:/Users/USER/Documents/art-fair-platform/.env.local";
    let enabledLine: string | null = process.env.ROB_EXPANSION_ENABLED ?? null;
    if (!enabledLine) {
      try {
        const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((item) => item.startsWith("ROB_EXPANSION_ENABLED="));
        enabledLine = line ? line.slice("ROB_EXPANSION_ENABLED=".length).trim().replace(/^"|"$/g, "") : null;
      } catch {
        enabledLine = null;
      }
    }
    console.log(JSON.stringify({
      mode: "READ_ONLY",
      writes: 0,
      dailyUnit: "RESEARCH_ACTION",
      expansionEnabled: parseBooleanFlag(enabledLine),
      weights: GRAPH_RANK_WEIGHTS,
      milestone: GRAPH_MILESTONE,
      graph: {
        ...graphHealth(graph),
        entityOnly: Math.max(0, Number(counts.rows[0]?.artists ?? 0) - graph.artists.length),
      },
      frontiers: exhibitionFrontiers(graph).length,
      safety: safety.rows[0],
      counts: counts.rows[0],
      realVisitorQueries: demand.length,
      rosterErrors,
      rosterAudit,
      observations: observations.length,
      candidateRowsConsidered: merged.observed,
      fixtureContamination: contaminated.length + leaked.length,
      fixtureSamples: contaminated.slice(0, 10).map((row) => row.label),
      top50: view,
      top30: ranked.slice(0, 30).map(describe),
      selected10: batch.selected.map(describe),
      next10: batch.selected.map((row) => ({ name: row.candidate.displayName, kind: row.kind, reason: row.researchReason, score: row.score, reasons: row.reasons })),
      kawsRank: findRank("kaws"),
      koreanRank: findRank("카우스"),
      estimatedFetches: batch.selected.length * 8,
    }, null, 2));
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));
  process.exitCode = 1;
});
