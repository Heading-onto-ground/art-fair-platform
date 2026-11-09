import type { ExpansionGraph } from "@/lib/history/expansionCandidates";
import { componentMembership, type GrowthSnapshot } from "@/lib/history/growth";
import { densityForCount } from "@/lib/history/policy";

/**
 * Read-only health of the verified exhibition graph.
 * Artist-to-artist degree and bridge paths come only from shared
 * exhibition participation. This module stores no RELATED_TO edge.
 */

export const RESEARCH_REASONS = [
  "UNRESOLVED_PARTICIPANT",
  "SHARED_EXHIBITION_FRONTIER",
  "SPARSE_ARTIST",
  "GRAPH_BRIDGE_CANDIDATE",
  "TRUSTED_ROSTER",
  "SEARCH_DEMAND",
  "TRUSTED_INSTITUTION_FRONTIER",
] as const;

export type ResearchReason = (typeof RESEARCH_REASONS)[number];

/** Internal density target. Not a public product promise and not a reason to invent records. */
export const GRAPH_MILESTONE = {
  usefulArtists: 500,
  verifiedExhibitionsMin: 3000,
  verifiedExhibitionsMax: 5000,
  laterArtists: 2000,
  laterExhibitions: 20000,
} as const;

export type GraphHealth = {
  artistCount: number;
  publicExhibitionCount: number;
  participationCount: number;
  entityOnly: number;
  lowDensity: number;
  historyReady: number;
  richHistory: number;
  connectedComponents: number;
  largestComponent: number;
  isolatedArtists: number;
  artistsDegreeAtLeast1: number;
  artistsDegreeAtLeast3: number;
  bridgePathCount: number;
  unresolvedParticipantCount: number;
};

export type BridgeEstimate = {
  existingArtistLinks: number;
  potentialPaths: number;
  componentCount: number;
  connectsComponents: boolean;
};

export type GraphYieldNote = {
  verifiedFacts: number;
  published: boolean;
  expanded: boolean;
  noResultReason: string | null;
};

export function expansionSnapshot(graph: ExpansionGraph): GrowthSnapshot {
  return {
    artists: graph.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels, exhibitionIds: artist.exhibitionIds })),
    exhibitions: graph.exhibitions.map((exhibition) => ({ ...exhibition, city: null })),
    unresolved: graph.unresolved.map((row) => ({ label: row.label, exhibitionTitle: row.exhibitionTitle })),
  };
}

/** Distinct other artists who share a verified exhibition. */
export function artistDegrees(graph: ExpansionGraph): Map<string, number> {
  const neighbors = new Map<string, Set<string>>();
  for (const artist of graph.artists) neighbors.set(artist.slug, new Set());
  for (const exhibition of graph.exhibitions) {
    const slugs = [...new Set(exhibition.artistSlugs)];
    for (const slug of slugs) {
      const bucket = neighbors.get(slug) ?? new Set<string>();
      for (const other of slugs) if (other !== slug) bucket.add(other);
      neighbors.set(slug, bucket);
    }
  }
  const degrees = new Map<string, number>();
  for (const [slug, bucket] of neighbors) degrees.set(slug, bucket.size);
  return degrees;
}

/** Unique artist pairs that co-appear on at least one verified exhibition. */
export function bridgePathCount(graph: ExpansionGraph): number {
  const pairs = new Set<string>();
  for (const exhibition of graph.exhibitions) {
    const slugs = [...new Set(exhibition.artistSlugs)].sort((left, right) => left.localeCompare(right));
    for (let i = 0; i < slugs.length; i += 1) {
      for (let j = i + 1; j < slugs.length; j += 1) pairs.add(`${slugs[i]}|${slugs[j]}`);
    }
  }
  return pairs.size;
}

export function graphHealth(graph: ExpansionGraph): GraphHealth {
  const degrees = artistDegrees(graph);
  const membership = componentMembership(expansionSnapshot(graph));
  const componentIds = new Set<number>();
  let entityOnly = 0;
  let lowDensity = 0;
  let historyReady = 0;
  let richHistory = 0;
  let largestComponent = 0;
  let isolatedArtists = 0;
  let artistsDegreeAtLeast1 = 0;
  let artistsDegreeAtLeast3 = 0;
  for (const artist of graph.artists) {
    const density = densityForCount(artist.exhibitionIds.length);
    if (density === "EMPTY") entityOnly += 1;
    else if (density === "LOW_DENSITY") lowDensity += 1;
    else if (density === "HISTORY_READY") historyReady += 1;
    else richHistory += 1;
    const degree = degrees.get(artist.slug) ?? 0;
    if (degree >= 1) artistsDegreeAtLeast1 += 1;
    if (degree >= 3) artistsDegreeAtLeast3 += 1;
    const member = membership.get(artist.slug);
    if (!member) continue;
    componentIds.add(member.id);
    largestComponent = Math.max(largestComponent, member.size);
    if (member.size <= 1) isolatedArtists += 1;
  }
  const unresolved = new Set(graph.unresolved.map((row) => row.label.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean));
  return {
    artistCount: graph.artists.length,
    publicExhibitionCount: graph.exhibitions.length,
    participationCount: graph.exhibitions.reduce((sum, exhibition) => sum + new Set(exhibition.artistSlugs).size, 0),
    entityOnly,
    lowDensity,
    historyReady,
    richHistory,
    connectedComponents: componentIds.size,
    largestComponent,
    isolatedArtists,
    artistsDegreeAtLeast1,
    artistsDegreeAtLeast3,
    bridgePathCount: bridgePathCount(graph),
    unresolvedParticipantCount: unresolved.size,
  };
}

export function graphDelta(before: GraphHealth, after: GraphHealth): GraphHealth {
  return {
    artistCount: after.artistCount - before.artistCount,
    publicExhibitionCount: after.publicExhibitionCount - before.publicExhibitionCount,
    participationCount: after.participationCount - before.participationCount,
    entityOnly: after.entityOnly - before.entityOnly,
    lowDensity: after.lowDensity - before.lowDensity,
    historyReady: after.historyReady - before.historyReady,
    richHistory: after.richHistory - before.richHistory,
    connectedComponents: after.connectedComponents - before.connectedComponents,
    largestComponent: after.largestComponent - before.largestComponent,
    isolatedArtists: after.isolatedArtists - before.isolatedArtists,
    artistsDegreeAtLeast1: after.artistsDegreeAtLeast1 - before.artistsDegreeAtLeast1,
    artistsDegreeAtLeast3: after.artistsDegreeAtLeast3 - before.artistsDegreeAtLeast3,
    bridgePathCount: after.bridgePathCount - before.bridgePathCount,
    unresolvedParticipantCount: after.unresolvedParticipantCount - before.unresolvedParticipantCount,
  };
}

/**
 * Paths a resolution would add: one documented link to each existing
 * co-exhibitor. Pairs those artists already share are not counted again.
 */
export function estimateBridge(
  sharedExistingArtists: readonly string[],
  membership: ReadonlyMap<string, { id: number; size: number }>,
): BridgeEstimate {
  const shared = [...new Set(sharedExistingArtists.filter((slug) => membership.has(slug)))];
  const components = new Set(shared.map((slug) => membership.get(slug)?.id).filter((id): id is number => id != null));
  return {
    existingArtistLinks: shared.length,
    potentialPaths: shared.length,
    componentCount: components.size,
    connectsComponents: components.size >= 2,
  };
}

export function sourceFamilyDistribution(rows: readonly { sourceFamily: string | null; sourceType: string }[]): { family: string; investigations: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const family = row.sourceFamily ?? row.sourceType;
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([family, investigations]) => ({ family, investigations }))
    .sort((left, right) => right.investigations - left.investigations || left.family.localeCompare(right.family));
}
