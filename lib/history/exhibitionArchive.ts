import {
  classifyCandidateLabel,
  isExpansionFixtureLabel,
  normalizeCandidateName,
  type CandidateObservation,
  type ExpansionGraph,
} from "@/lib/history/expansionCandidates";
import { estimateBridge, expansionSnapshot } from "@/lib/history/expansionGraphValue";
import { componentMembership } from "@/lib/history/growth";
import { resolveArtistSlug } from "@/lib/history/identity";
import { classifyTrustedUrl, crawlTrustedPage, type CrawlFact } from "@/lib/history/trustedCrawl";

/**
 * Trusted exhibition archive supply.
 *
 * ResearchJob stays an artist investigation. An archive page is not stuffed
 * into artist-identity fields, and this module does not publish. It discovers
 * exhibition URLs on institutions ROB already trusts, reads those pages with
 * the existing exhibition adapters, and queues explicit unresolved participants
 * as candidate observations. The current research and publication gates run
 * later, when a scheduled action selects one of those candidates.
 *
 * Kukje and Gallery Hyundai are the V1 windows because their exhibition-page
 * adapters already separate an explicit participant list from titles, rosters,
 * and navigation. No new host is trusted here.
 */

export const ARCHIVE_WINDOWS = [
  { institution: "Kukje Gallery", indexUrl: "https://www.kukjegallery.com/exhibitions/past" },
  { institution: "Gallery Hyundai", indexUrl: "https://www.galleryhyundai.com/exhibition/archive" },
] as const;

/** One recent index page and a few exhibition pages per archive. Not a historical crawl. */
export const ARCHIVE_LIMITS = {
  archivesPerRun: 2,
  exhibitionPagesPerArchive: 3,
  maxRequests: 8,
} as const;

export type ArchiveFamilyYield = {
  institution: string;
  indexUrl: string;
  archivePagesFetched: number;
  exhibitionUrlsFound: number;
  newExhibitionTargets: number;
  knownExhibitionsSkipped: number;
  gateReadyExhibitions: number;
  explicitParticipations: number;
  newUnresolvedCandidates: number;
  existingArtistMatches: string[];
  newGraphPaths: number;
};

export type ArchiveRunNote = {
  requests: number;
  exhibitionUrlsFound: number;
  knownSkipped: number;
  newTargets: number;
  unresolvedNames: string[];
  existingMatches: string[];
  estimatedBridgePaths: number;
  inspectedExhibitionUrls: string[];
  families: ArchiveFamilyYield[];
};

export type ArchivePageReview = {
  url: string;
  institution: string;
  title: string | null;
  year: number | null;
  venue: string | null;
  decision: string;
  reason: string;
  duplicate: string | null;
  participants: { label: string; evidence: string; identity: string; slug: string | null; evidenceLocation: string }[];
};

export type ArchiveHarvest = {
  requests: number;
  observations: CandidateObservation[];
  pages: ArchivePageReview[];
  errors: string[];
  note: ArchiveRunNote;
};

export function normalizeExhibitionUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "kukjegallery.com") {
    const seq = url.searchParams.get("seq");
    if (url.pathname.replace(/\/$/, "") !== "/exhibitions/view" || !seq || !/^\d+$/.test(seq)) return null;
    return `https://kukjegallery.com/exhibitions/view?seq=${seq}`;
  }
  if (host === "galleryhyundai.com") {
    const match = url.pathname.match(/^\/exhibition\/view\/(\d+)\/?$/);
    if (!match?.[1]) return null;
    return `https://galleryhyundai.com/exhibition/view/${match[1]}`;
  }
  return null;
}

function exhibitionSerial(url: string): number {
  const parsed = new URL(url);
  const seq = parsed.searchParams.get("seq");
  if (seq && /^\d+$/.test(seq)) return Number(seq);
  const match = parsed.pathname.match(/(\d+)$/);
  return match?.[1] ? Number(match[1]) : 0;
}

/** Exhibition-page URLs on the same trusted host. Roster, shop, and external links are dropped. */
export function exhibitionUrlsFromArchive(html: string, pageUrl: string): string[] {
  const source = classifyTrustedUrl(pageUrl);
  if (!source || (source.host !== "kukjegallery.com" && source.host !== "galleryhyundai.com")) return [];
  const seen = new Set<string>();
  const found: string[] = [];
  for (const match of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    let absolute: URL;
    try {
      absolute = new URL(match[1] ?? "", pageUrl);
    } catch {
      continue;
    }
    if (absolute.hostname.replace(/^www\./, "").toLowerCase() !== source.host) continue;
    const key = normalizeExhibitionUrl(absolute.href);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    found.push(key);
  }
  return found;
}

export function selectUnseenExhibitionUrls(urls: readonly string[], known: ReadonlySet<string>, limit: number): string[] {
  const unique = [...new Set(urls.map((url) => normalizeExhibitionUrl(url)).filter((url): url is string => Boolean(url)))];
  unique.sort((left, right) => exhibitionSerial(right) - exhibitionSerial(left) || left.localeCompare(right));
  const selected: string[] = [];
  for (const url of unique) {
    if (known.has(url)) continue;
    selected.push(url);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function knownExhibitionUrls(graph: ExpansionGraph, extra: readonly string[] = []): Set<string> {
  const known = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (!value) return;
    const key = normalizeExhibitionUrl(value);
    if (key) known.add(key);
  };
  for (const exhibition of graph.exhibitions) {
    for (const url of exhibition.sourceUrls ?? []) add(url);
  }
  for (const row of graph.unresolved) add(row.sourceUrl);
  for (const url of extra) add(url);
  return known;
}

/**
 * Explicit unresolved participants become observations. Exact artists stay in
 * the shared-context list and do not become new entities or extra re-research.
 * Title mentions, roster links, and fixture labels never become observations.
 */
export function observationsFromExhibitionFacts(facts: readonly CrawlFact[], graph: ExpansionGraph, seenAt: string, limit: number): CandidateObservation[] {
  const names = graph.artists.map((artist) => ({ slug: artist.slug, labels: artist.labels }));
  const pending: CandidateObservation[] = [];
  for (const fact of facts) {
    if (fact.duplicate === "EXACT") continue;
    const explicit = fact.participants.filter((person) => person.evidence === "EXPLICIT_PARTICIPANT");
    const shared = [...new Set(explicit.filter((person) => person.identity === "EXACT" && person.slug).map((person) => person.slug as string))];
    const sourceUrl = normalizeExhibitionUrl(fact.provenance.sourceUrl) ?? fact.provenance.sourceUrl;
    for (const person of explicit) {
      if (person.identity === "EXACT") continue;
      if (classifyCandidateLabel(person.label) !== "PERSON_LIKE") continue;
      if (isExpansionFixtureLabel(person.label)) continue;
      if (!normalizeCandidateName(person.label)) continue;
      if (resolveArtistSlug(person.label, names)) continue;
      pending.push({
        label: person.label,
        sourceType: "TRUSTED_EXHIBITION_ARCHIVE",
        sourceContext: "GRAPH_FRONTIER",
        sourceUrl,
        seenAt,
        unresolvedOccurrences: 1,
        sharedExistingArtists: shared,
        sourceHints: [sourceUrl],
        via: { exhibitionTitle: fact.title, institution: fact.provenance.sourceName },
      });
    }
  }
  pending.sort((left, right) => (right.sharedExistingArtists?.length ?? 0) - (left.sharedExistingArtists?.length ?? 0) || left.label.localeCompare(right.label));
  return pending.slice(0, Math.max(0, limit));
}

export async function harvestExhibitionArchive(input: {
  graph: ExpansionGraph;
  knownUrls?: readonly string[];
  seenAt: string;
  limit: number;
  fetchDocument: (url: string) => Promise<{ html: string | null; requests: number }>;
}): Promise<ArchiveHarvest> {
  const known = knownExhibitionUrls(input.graph, input.knownUrls ?? []);
  const families: ArchiveFamilyYield[] = [];
  const pages: ArchivePageReview[] = [];
  const facts: CrawlFact[] = [];
  const inspected: string[] = [];
  const errors: string[] = [];
  let requests = 0;
  const snapshot = expansionSnapshot(input.graph);
  const windows = ARCHIVE_WINDOWS.slice(0, ARCHIVE_LIMITS.archivesPerRun);

  for (const window of windows) {
    if (requests >= ARCHIVE_LIMITS.maxRequests) break;
    const family: ArchiveFamilyYield = {
      institution: window.institution,
      indexUrl: window.indexUrl,
      archivePagesFetched: 0,
      exhibitionUrlsFound: 0,
      newExhibitionTargets: 0,
      knownExhibitionsSkipped: 0,
      gateReadyExhibitions: 0,
      explicitParticipations: 0,
      newUnresolvedCandidates: 0,
      existingArtistMatches: [],
      newGraphPaths: 0,
    };
    let indexHtml: string | null = null;
    try {
      const index = await input.fetchDocument(window.indexUrl);
      requests += Math.max(0, index.requests);
      indexHtml = index.html;
    } catch (error) {
      errors.push(`${window.institution} index: ${error instanceof Error ? error.message : "fetch failed"}`);
    }
    if (indexHtml) family.archivePagesFetched += 1;
    const urls = indexHtml ? exhibitionUrlsFromArchive(indexHtml, window.indexUrl) : [];
    family.exhibitionUrlsFound = urls.length;
    family.knownExhibitionsSkipped = urls.filter((url) => known.has(url)).length;
    const selected = selectUnseenExhibitionUrls(urls, known, ARCHIVE_LIMITS.exhibitionPagesPerArchive);
    family.newExhibitionTargets = selected.length;
    for (const url of selected) {
      if (requests >= ARCHIVE_LIMITS.maxRequests) break;
      known.add(url);
      inspected.push(url);
      let html: string | null = null;
      try {
        const page = await input.fetchDocument(url);
        requests += Math.max(0, page.requests);
        html = page.html;
      } catch (error) {
        errors.push(`${url}: ${error instanceof Error ? error.message : "fetch failed"}`);
      }
      family.archivePagesFetched += 1;
      if (!html) continue;
      const parsed = crawlTrustedPage({
        url,
        html,
        retrievedAt: input.seenAt,
        artists: input.graph.artists,
        snapshot,
        snapshotReady: true,
      });
      for (const fact of parsed) {
        facts.push(fact);
        const explicit = fact.participants.filter((person) => person.evidence === "EXPLICIT_PARTICIPANT");
        family.explicitParticipations += explicit.length;
        for (const person of explicit) {
          if (person.identity === "EXACT" && person.slug && !family.existingArtistMatches.includes(person.slug)) family.existingArtistMatches.push(person.slug);
        }
        if (fact.decision === "AUTO_IMPORT" && fact.duplicate !== "EXACT") family.gateReadyExhibitions += 1;
        pages.push({
          url,
          institution: window.institution,
          title: fact.title,
          year: fact.startYear,
          venue: fact.venue,
          decision: fact.decision,
          reason: fact.reason,
          duplicate: fact.duplicate,
          participants: fact.participants.map((person) => ({
            label: person.label,
            evidence: person.evidence,
            identity: person.identity,
            slug: person.slug,
            evidenceLocation: person.evidenceLocation,
          })),
        });
      }
    }
    families.push(family);
  }

  const observations = observationsFromExhibitionFacts(facts, input.graph, input.seenAt, input.limit);
  const membership = componentMembership(snapshot);
  for (const family of families) {
    const rows = observations.filter((row) => row.via?.institution === family.institution);
    family.newUnresolvedCandidates = rows.length;
    family.newGraphPaths = rows.reduce((sum, row) => sum + estimateBridge(row.sharedExistingArtists ?? [], membership).potentialPaths, 0);
  }
  const unresolvedNames = [...new Set(observations.map((row) => row.label))].sort((left, right) => left.localeCompare(right));
  const existingMatches = [...new Set(families.flatMap((family) => family.existingArtistMatches))].sort((left, right) => left.localeCompare(right));
  return {
    requests,
    observations,
    pages,
    errors,
    note: {
      requests,
      exhibitionUrlsFound: families.reduce((sum, family) => sum + family.exhibitionUrlsFound, 0),
      knownSkipped: families.reduce((sum, family) => sum + family.knownExhibitionsSkipped, 0),
      newTargets: families.reduce((sum, family) => sum + family.newExhibitionTargets, 0),
      unresolvedNames,
      existingMatches,
      estimatedBridgePaths: families.reduce((sum, family) => sum + family.newGraphPaths, 0),
      inspectedExhibitionUrls: inspected,
      families,
    },
  };
}
