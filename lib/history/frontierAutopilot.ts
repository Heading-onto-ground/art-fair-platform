import { aliasLookupEqual } from "@/lib/history/identity";
import {
  componentMembership,
  largestComponentSize,
  type FrontierReason,
  type FrontierRow,
  type GrowthSnapshot,
} from "@/lib/history/growth";
import { densityForCount } from "@/lib/history/policy";

export const AUTOPILOT_BATCH_MIN = 5;
export const AUTOPILOT_BATCH_MAX = 10;
export const AUTOPILOT_BATCH_DEFAULT = 8;

export const WATCHED_FRONTIER = [
  "Youn Myeungro",
  "Lee Seung Jio",
  "Park Hyun-Ki",
  "Kim Hyung Dae",
  "Kim, Guirin",
] as const;

export type RankedFrontier = {
  rank: number;
  artist: string;
  frontierType: FrontierReason;
  score: number;
  explanation: string[];
  exhibitionCount: number;
  componentId: number;
  componentSize: number;
  searchDemand: number;
  aliases: string[];
  knownSourceCandidates: string[];
  previousOutcomes: string[];
};

export type PublicGraphCounts = {
  publicArtists: number;
  empty: number;
  lowDensity: number;
  historyReady: number;
  richHistory: number;
  publicExhibitions: number;
  publicParticipations: number;
  largestConnectedComponent: number;
  sharedExhibitions: number;
  directArtistPairs: number;
  documentedTwoHopPaths: number;
  documentedThreeArtistRoutes: number;
  isolatedPublicArtists: number;
  unresolvedParticipantLabels: number;
};

function sameArtist(left: string, right: string): boolean {
  return left === right || aliasLookupEqual(left, right);
}

function pointsForDemand(count: number): number {
  if (count <= 0) return 0;
  return Math.min(count, 12) * 3;
}

export function scoreFrontierRow(input: {
  row: FrontierRow;
  largestComponent: number;
  unresolvedOccurrences: number;
  entityExists: boolean;
  ambiguous: boolean;
  previousOutcomes: readonly string[];
}): { score: number; explanation: string[] } {
  let score = 0;
  const explanation: string[] = [];
  const add = (points: number, reason: string) => {
    score += points;
    explanation.push(`${points > 0 ? "+" : ""}${points} ${reason}`);
  };
  if (input.row.reason === "SPARSE_CONNECTED_ARTIST") {
    add(40, "connected artist with sparse history");
    if (input.largestComponent > 1 && input.row.currentComponent === input.largestComponent) {
      add(15, "already inside the largest component");
    }
  } else if (input.row.reason === "UNRESOLVED_PARTICIPANT") {
    add(22, "unresolved participant on a recorded exhibition");
    const extra = Math.max(0, input.unresolvedOccurrences - 1);
    if (extra > 0) add(extra * 8, `same unresolved label appears ${input.unresolvedOccurrences} times`);
    if (input.row.sharedMomentSource) add(12, "already named on a shared exhibition");
  } else if (input.row.reason === "SEARCHED_MISSING_ARTIST") {
    add(10, "visitor search did not find this artist");
  } else if (input.row.reason === "BRIDGE_CANDIDATE") {
    add(28, "possible bridge between graph components");
  } else if (input.row.reason === "ISOLATED_ARTIST") {
    add(4, "isolated artist");
    add(-12, "isolated solo has little graph value until a shared exhibition exists");
  }
  const demand = pointsForDemand(input.row.searchDemand);
  if (demand > 0) add(demand, `visitor missing-search demand ${input.row.searchDemand}`);
  if (input.entityExists) add(12, "verified artist entity already exists");
  const sources = Math.min(input.row.candidateSources.length, 3);
  if (sources > 0) add(sources * 6, `${input.row.candidateSources.length} known official source candidates`);
  if (input.row.currentRecords > 0 && input.row.currentRecords < 3 && input.row.currentComponent > 1) {
    add(10, "history gap inside a connected component");
  }
  if (input.ambiguous) add(-25, "ambiguous identity");
  const previous = input.previousOutcomes;
  if (previous.length > 0 && previous.every((outcome) => outcome === "SOURCE_UNAVAILABLE" || outcome === "HOST_OUTSIDE_V1")) {
    add(-20, "repeated source failure");
  }
  if (previous.length > 0 && previous.every((outcome) => outcome === "INCOMPLETE_FACT" || outcome === "NO_PARTICIPANT_LIST")) {
    add(-15, "repeated incomplete fact and no new source");
  }
  if (previous.includes("TITLE_ONLY")) add(-10, "title-only evidence");
  if (previous.includes("NO_OFFICIAL_SOURCE")) add(-8, "no official source found on a previous run");
  return { score, explanation };
}

export function rankAutopilotFrontier(input: {
  rows: readonly FrontierRow[];
  snapshot: GrowthSnapshot;
  ambiguousArtists?: readonly string[];
  previousOutcomes?: ReadonlyMap<string, readonly string[]>;
}): RankedFrontier[] {
  const membership = componentMembership(input.snapshot);
  const largest = largestComponentSize(input.snapshot);
  const occurrences = new Map<string, number>();
  for (const name of input.snapshot.unresolved) {
    const key = name.label;
    occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
  }
  const aliases = new Map(input.snapshot.artists.map((artist) => [artist.slug, artist.labels]));
  const ambiguous = input.ambiguousArtists ?? [];
  const previous = input.previousOutcomes ?? new Map<string, readonly string[]>();
  const scored = input.rows.map((row) => {
    const member = membership.get(row.artist);
    const entityExists = aliases.has(row.artist);
    const occurrence = [...occurrences.entries()].find(([label]) => sameArtist(label, row.artist))?.[1] ?? 0;
    const prior = [...previous.entries()].find(([artist]) => sameArtist(artist, row.artist))?.[1] ?? [];
    const result = scoreFrontierRow({
      row,
      largestComponent: largest,
      unresolvedOccurrences: occurrence,
      entityExists,
      ambiguous: ambiguous.some((artist) => sameArtist(artist, row.artist)),
      previousOutcomes: prior,
    });
    return {
      artist: row.artist,
      frontierType: row.reason,
      score: result.score,
      explanation: result.explanation,
      exhibitionCount: row.currentRecords,
      componentId: member?.id ?? 0,
      componentSize: member?.size ?? row.currentComponent,
      searchDemand: row.searchDemand,
      aliases: aliases.get(row.artist) ?? [],
      knownSourceCandidates: [...row.candidateSources],
      previousOutcomes: [...prior],
    };
  });
  scored.sort((left, right) => right.score - left.score || right.searchDemand - left.searchDemand || left.artist.localeCompare(right.artist) || left.frontierType.localeCompare(right.frontierType));
  return scored.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function selectAutopilotBatch(ranked: readonly RankedFrontier[], limit = AUTOPILOT_BATCH_DEFAULT): RankedFrontier[] {
  const requested = Number.isFinite(limit) ? Math.trunc(limit) : AUTOPILOT_BATCH_DEFAULT;
  const size = Math.min(AUTOPILOT_BATCH_MAX, Math.max(AUTOPILOT_BATCH_MIN, requested));
  const chosen: RankedFrontier[] = [];
  const seen = new Set<string>();
  for (const row of ranked) {
    const key = row.artist.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(row);
    if (chosen.length >= size) break;
  }
  return chosen;
}

export function watchFrontierPlacement(ranked: readonly RankedFrontier[]): {
  name: string;
  rank: number | null;
  score: number | null;
  frontierType: FrontierReason | null;
}[] {
  return WATCHED_FRONTIER.map((name) => {
    const hit = ranked.find((row) => sameArtist(row.artist, name) || row.aliases.some((alias) => sameArtist(alias, name)));
    return {
      name,
      rank: hit?.rank ?? null,
      score: hit?.score ?? null,
      frontierType: hit?.frontierType ?? null,
    };
  });
}

export function summarizePublicGraph(snapshot: GrowthSnapshot, documentedTwoHopPaths: number): PublicGraphCounts {
  let empty = 0;
  let lowDensity = 0;
  let historyReady = 0;
  let richHistory = 0;
  let isolated = 0;
  const membership = componentMembership(snapshot);
  for (const artist of snapshot.artists) {
    const density = densityForCount(artist.exhibitionIds.length);
    if (density === "EMPTY") empty += 1;
    else if (density === "LOW_DENSITY") lowDensity += 1;
    else if (density === "HISTORY_READY") historyReady += 1;
    else richHistory += 1;
    if ((membership.get(artist.slug)?.size ?? 1) <= 1) isolated += 1;
  }
  const pairs = new Set<string>();
  let participations = 0;
  let threeArtistRoutes = 0;
  for (const exhibition of snapshot.exhibitions) {
    const unique = [...new Set(exhibition.artistSlugs)].sort();
    participations += unique.length;
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) pairs.add(`${unique[i]}|${unique[j]}`);
    }
  }
  for (let i = 0; i < snapshot.exhibitions.length; i += 1) {
    for (let j = i + 1; j < snapshot.exhibitions.length; j += 1) {
      const left = snapshot.exhibitions[i];
      const right = snapshot.exhibitions[j];
      const shared = left.artistSlugs.filter((slug) => right.artistSlugs.includes(slug));
      if (shared.length !== 1) continue;
      const sides = new Set([...left.artistSlugs, ...right.artistSlugs]);
      if (sides.size >= 3) threeArtistRoutes += 1;
    }
  }
  return {
    publicArtists: snapshot.artists.length,
    empty,
    lowDensity,
    historyReady,
    richHistory,
    publicExhibitions: snapshot.exhibitions.length,
    publicParticipations: participations,
    largestConnectedComponent: largestComponentSize(snapshot),
    sharedExhibitions: snapshot.exhibitions.filter((exhibition) => new Set(exhibition.artistSlugs).size >= 2).length,
    directArtistPairs: pairs.size,
    documentedTwoHopPaths,
    documentedThreeArtistRoutes: threeArtistRoutes,
    isolatedPublicArtists: isolated,
    unresolvedParticipantLabels: new Set(snapshot.unresolved.map((row) => row.label)).size,
  };
}
