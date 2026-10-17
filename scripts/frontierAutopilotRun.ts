import { PrismaClient } from "@prisma/client";
import { buildDocumentedPaths } from "../lib/history/paths";
import { buildGraphFrontier, previewCandidates, type FactualCandidate, type GrowthSnapshot } from "../lib/history/growth";
import { aliasLookupEqual, resolveVerifiedAlias } from "../lib/history/identity";
import { FRONTIER_CASES } from "../lib/history/frontierCases";
import {
  rankAutopilotFrontier,
  selectAutopilotBatch,
  summarizePublicGraph,
  watchFrontierPlacement,
  WATCHED_FRONTIER,
  type RankedFrontier,
} from "../lib/history/frontierAutopilot";
import { publicExhibitionWhere } from "../lib/history/queries";
import { prisma as untypedPrisma } from "../lib/prisma";
import {
  CONTROL_ARTISTS,
  VOICE_ACTOR_ENTITY_ID,
  aliasesFor,
  canonicalArtistName,
  crawlerCanFetch,
  discoverTrustedSources,
  extractionCoverage,
  type DiscoveryEntity,
  type DiscoveryInstitution,
} from "../lib/history/sourceDiscovery";
import { aicExactAgent, clevelandMatchedWorks, classifyFetchedPage, tateResultLinks } from "../lib/history/institutionPages";
import { classifyTrustedUrl, crawlTrustedPage, fetchTrustedDocument, type CrawlFact } from "../lib/history/trustedCrawl";

const prisma = untypedPrisma as PrismaClient;
const USER_AGENT = "ROB-frontier-autopilot/1.0 (dry-run; no production write)";

type ApiEntity = {
  id?: string;
  labels?: Record<string, { value?: string }>;
  descriptions?: Record<string, { value?: string }>;
  aliases?: Record<string, { value?: string }[]>;
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
};

function claimValues(entity: ApiEntity, prop: string): unknown[] {
  return (entity.claims?.[prop] ?? []).flatMap((claim) => {
    const value = claim.mainsnak?.datavalue?.value;
    return value === undefined ? [] : [value];
  });
}

function claimIds(entity: ApiEntity, prop: string): string[] {
  return claimValues(entity, prop).flatMap((value) => {
    if (typeof value === "object" && value && "id" in value && typeof value.id === "string") return [value.id];
    return [];
  });
}

function claimStrings(entity: ApiEntity, prop: string): string[] {
  return claimValues(entity, prop).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function textOf(map: Record<string, { value?: string }> | undefined): string {
  return map?.en?.value || map?.ko?.value || Object.values(map ?? []).find((item) => item.value)?.value || "";
}

function toArtist(id: string, entity: ApiEntity): DiscoveryEntity {
  const aliases = Object.values(entity.aliases ?? {}).flatMap((items) => items.flatMap((item) => item.value ? [item.value] : []));
  return {
    id,
    label: textOf(entity.labels),
    description: textOf(entity.descriptions),
    aliases,
    instanceOf: claimIds(entity, "P31"),
    occupations: claimIds(entity, "P106"),
    officialWebsites: claimStrings(entity, "P856"),
    collectionIds: claimIds(entity, "P6379"),
  };
}

function toInstitution(id: string, entity: ApiEntity): DiscoveryInstitution {
  return {
    id,
    label: textOf(entity.labels),
    description: textOf(entity.descriptions),
    instanceOf: claimIds(entity, "P31"),
    officialWebsites: claimStrings(entity, "P856"),
  };
}

async function wikidata(query: string, last: { at: number }): Promise<unknown> {
  const wait = Math.max(0, 1200 - (Date.now() - last.at));
  if (last.at > 0 && wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  last.at = Date.now();
  const response = await fetch(`https://www.wikidata.org/w/api.php?${query}`, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok || text.startsWith("You are making too many requests")) throw new Error("WIKIDATA_RATE_LIMIT");
  return JSON.parse(text) as unknown;
}

function discoveryIdentity(target: RankedFrontier, snapshot: GrowthSnapshot): { slug: string; matchLabels: string[] } {
  const entity = snapshot.artists.find((artist) => artist.slug === target.artist || artist.labels.some((label) => aliasLookupEqual(label, target.artist)));
  if (entity) return { slug: entity.slug, matchLabels: entity.labels };
  const verified = resolveVerifiedAlias(target.artist);
  if (verified) return { slug: verified, matchLabels: [] };
  return { slug: target.artist, matchLabels: [] };
}

function searchLabel(artist: string, aliases: string[]): { name: string; language: "en" | "ko" } {
  const canonical = canonicalArtistName(artist);
  const name = canonical !== artist ? canonical : aliases.find((alias) => /[A-Za-z\uac00-\ud7a3]/.test(alias)) ?? artist;
  return { name, language: /[가-힣]/.test(name) ? "ko" : "en" };
}

function candidateFromFact(fact: CrawlFact): FactualCandidate {
  return {
    artistNames: fact.participants.filter((person) => person.evidence === "EXPLICIT_PARTICIPANT").map((person) => person.label),
    title: fact.title ?? "",
    startYear: fact.startYear,
    startMonth: fact.startMonth,
    startDay: fact.startDay,
    endYear: fact.endYear,
    endMonth: fact.endMonth,
    endDay: fact.endDay,
    datePrecision: fact.datePrecision,
    space: fact.venue,
    city: fact.city,
    country: fact.country,
    curatorNames: fact.curators.map((curator) => curator.rawName),
    sourceName: fact.provenance.sourceName,
    sourceUrl: fact.provenance.sourceUrl,
    retrievedAt: fact.provenance.retrievedAt,
    evidenceShort: fact.reason,
    externalIds: [],
    pilotRecordId: fact.pilotRecordId,
  };
}

async function loadGraph(): Promise<{ snapshot: GrowthSnapshot; demand: { query: string; count: number }[]; documentedTwoHopPaths: number }> {
  const [exhibitions, unresolved, signals] = await Promise.all([
    prisma.exhibition.findMany({
      where: publicExhibitionWhere,
      select: {
        id: true,
        title: true,
        space: { select: { name: true } },
        historyMeta: { select: { startYear: true, slug: true } },
        historyArtists: {
          select: {
            artist: {
              select: {
                slug: true,
                canonicalName: true,
                nativeName: true,
                aliases: { select: { label: true } },
              },
            },
          },
        },
      },
    }),
    prisma.historyUnresolvedName.findMany({
      select: { label: true, exhibition: { select: { title: true } } },
    }),
    prisma.historySignal.groupBy({
      by: ["path"],
      where: { name: "SEARCH_NO_RESULT" },
      _count: { _all: true },
    }),
  ]);
  const artists = new Map<string, GrowthSnapshot["artists"][number]>();
  for (const exhibition of exhibitions) {
    for (const row of exhibition.historyArtists) {
      const current = artists.get(row.artist.slug) ?? {
        slug: row.artist.slug,
        labels: [row.artist.canonicalName, row.artist.nativeName, ...row.artist.aliases.map((alias) => alias.label)].filter((label): label is string => Boolean(label)),
        exhibitionIds: [],
      };
      if (!current.exhibitionIds.includes(exhibition.id)) current.exhibitionIds.push(exhibition.id);
      artists.set(row.artist.slug, current);
    }
  }
  const snapshot: GrowthSnapshot = {
    artists: [...artists.values()],
    exhibitions: exhibitions.map((exhibition) => ({
      id: exhibition.id,
      title: exhibition.title,
      year: exhibition.historyMeta?.startYear ?? null,
      space: exhibition.space?.name ?? null,
      city: null,
      artistSlugs: exhibition.historyArtists.map((row) => row.artist.slug),
    })),
    unresolved: unresolved.map((row) => ({ label: row.label, exhibitionTitle: row.exhibition.title })),
  };
  const paths = buildDocumentedPaths(
    exhibitions.map((exhibition) => ({
      id: exhibition.id,
      slug: exhibition.historyMeta?.slug ?? null,
      title: exhibition.title,
      year: exhibition.historyMeta?.startYear ?? null,
      artists: exhibition.historyArtists.map((row) => ({ slug: row.artist.slug, name: row.artist.canonicalName })),
    })),
    20000,
  );
  return {
    snapshot,
    demand: signals
      .filter((row) => row.path)
      .map((row) => ({ query: row.path as string, count: row._count._all }))
      .sort((left, right) => right.count - left.count || left.query.localeCompare(right.query)),
    documentedTwoHopPaths: paths.length,
  };
}

async function investigate(batch: RankedFrontier[], snapshot: GrowthSnapshot): Promise<{
  targets: unknown[];
  extraction: ReturnType<typeof extractionCoverage>;
  candidates: unknown[];
}> {
  const last = { at: 0 };
  const foundIds = new Map<string, string[]>();
  for (const target of batch) {
    const label = searchLabel(target.artist, target.aliases);
    try {
      const payload = await wikidata(`action=wbsearchentities&search=${encodeURIComponent(label.name)}&language=${label.language}&format=json&limit=8`, last) as {
        search?: { id?: string }[];
      };
      foundIds.set(target.artist, (payload.search ?? []).flatMap((item) => item.id ? [item.id] : []));
    } catch (error) {
      const message = error instanceof Error ? error.message : "WIKIDATA_FAILED";
      foundIds.set(target.artist, []);
      target.previousOutcomes = [...target.previousOutcomes, message];
    }
  }
  const artistIds = [...new Set([...foundIds.values()].flat())];
  const artistEntities = new Map<string, ApiEntity>();
  if (artistIds.length > 0) {
    const payload = await wikidata(`action=wbgetentities&ids=${artistIds.join("|")}&props=labels|aliases|descriptions|claims&languages=en|ko&format=json`, last) as {
      entities?: Record<string, ApiEntity>;
    };
    for (const [id, entity] of Object.entries(payload.entities ?? {})) artistEntities.set(id, entity);
  }
  const discovered = batch.map((target) => {
    const entities = (foundIds.get(target.artist) ?? []).flatMap((id) => {
      const entity = artistEntities.get(id);
      return entity ? [toArtist(id, entity)] : [];
    });
    return { target, entities };
  });
  const collectionIds = [...new Set(discovered.flatMap((row) => row.entities.flatMap((entity) => entity.collectionIds)))];
  const institutions: DiscoveryInstitution[] = [];
  if (collectionIds.length > 0) {
    const payload = await wikidata(`action=wbgetentities&ids=${collectionIds.join("|")}&props=labels|descriptions|claims&languages=en|ko&format=json`, last) as {
      entities?: Record<string, ApiEntity>;
    };
    for (const [id, entity] of Object.entries(payload.entities ?? {})) institutions.push(toInstitution(id, entity));
  }
  const queued = new Map<string, string[]>();
  const addUrl = (artist: string, url: string) => {
    const list = queued.get(artist) ?? [];
    if (!list.includes(url)) list.push(url);
    queued.set(artist, list);
  };
  for (const target of batch) {
    for (const url of target.knownSourceCandidates) addUrl(target.artist, url);
  }
  const discoveries = discovered.map(({ target, entities }) => {
    const identity = discoveryIdentity(target, snapshot);
    const found = discoverTrustedSources({
      artistId: identity.slug,
      entities,
      institutions,
      matchLabels: identity.matchLabels,
    });
    for (const item of found.candidates) addUrl(target.artist, item.sourceUrl);
    return {
      target,
      identitySlug: identity.slug,
      ...found,
      wrongPerson: found.resolvedEntityId === VOICE_ACTOR_ENTITY_ID,
    };
  });
  const fetchState = { cache: new Map(), lastByHost: new Map<string, number>() };
  for (const discovery of discoveries) {
    const aliases = [...new Set([...aliasesFor(discovery.identitySlug), ...discovery.target.aliases, canonicalArtistName(discovery.identitySlug)])];
    if (discovery.candidates.some((item) => item.sourceDomain === "tate.org.uk")) {
      const search = await fetchTrustedDocument(`https://www.tate.org.uk/search?q=${encodeURIComponent(searchLabel(discovery.target.artist, discovery.target.aliases).name)}`, fetchState);
      const links = search.html ? tateResultLinks(search.html) : [];
      for (const link of links.filter((item) => classifyFetchedPage(item) === "EXHIBITION").slice(0, 2)) addUrl(discovery.target.artist, link);
      const mentioned = (item: string) => aliases.some((alias) => {
        const token = alias.toLowerCase().replace(/[\s\u2010-\u2014-]+/g, "-");
        return token.length >= 6 && item.toLowerCase().includes(token);
      });
      for (const link of links.filter((item) => classifyFetchedPage(item) === "ARTIST_PROFILE" && mentioned(item)).slice(0, 1)) addUrl(discovery.target.artist, link);
    }
    if (discovery.candidates.some((item) => item.sourceDomain === "clevelandart.org")) {
      for (const alias of aliases) {
        const works = await fetchTrustedDocument(`https://openaccess-api.clevelandart.org/api/artworks/?artists=${encodeURIComponent(alias)}&limit=5`, fetchState);
        const matched = clevelandMatchedWorks(works.json, aliases);
        if (matched.exhibitionIds.length === 0 && matched.objectUrls.length === 0) continue;
        for (const id of matched.exhibitionIds.slice(0, 2)) addUrl(discovery.target.artist, `https://openaccess-api.clevelandart.org/api/exhibitions/${id}`);
        break;
      }
    }
    if (discovery.candidates.some((item) => item.sourceDomain === "artic.edu")) {
      const agents = await fetchTrustedDocument(`https://api.artic.edu/api/v1/agents/search?q=${encodeURIComponent(searchLabel(discovery.target.artist, discovery.target.aliases).name)}&limit=5&fields=id,title`, fetchState);
      const agent = aicExactAgent(agents.json, aliases);
      if (agent) addUrl(discovery.target.artist, `https://api.artic.edu/api/v1/agents/${agent.id}`);
    }
  }
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const pages: { artist: string; fetchable: boolean; note: string; pageType: string | null; sourceUrl: string; facts: CrawlFact[] }[] = [];
  const seenUrls = new Map<string, { fetchable: boolean; note: string; facts: CrawlFact[] }>();
  for (const [artist, urls] of queued) {
    for (const url of urls) {
      let parsed = seenUrls.get(url);
      if (!parsed) {
        if (!crawlerCanFetch(url)) parsed = { fetchable: false, note: "HOST_OUTSIDE_V1", facts: [] };
        else {
          const page = await fetchTrustedDocument(url, fetchState);
          if (page.blocked || (!page.html && page.json === undefined)) parsed = { fetchable: false, note: page.blocked ?? "SOURCE_UNAVAILABLE", facts: [] };
          else {
            const facts = crawlTrustedPage({
              url,
              retrievedAt,
              html: page.html,
              json: page.json,
              artists: snapshot.artists,
              snapshot,
              snapshotReady: true,
            });
            parsed = { fetchable: true, note: facts[0]?.reason ?? "PARSED", facts };
          }
        }
        seenUrls.set(url, parsed);
      }
      pages.push({ artist, sourceUrl: url, fetchable: parsed.fetchable, note: parsed.note, pageType: parsed.facts[0]?.pageType ?? null, facts: parsed.facts });
    }
  }
  const candidates: unknown[] = [];
  const targets = discoveries.map((discovery) => {
    const ownPages = pages.filter((page) => page.artist === discovery.target.artist);
    const facts = ownPages.flatMap((page) => page.facts.map((fact) => ({ page, fact })));
    const previews = facts.flatMap(({ page, fact }) => {
      if (!fact.title || fact.reason === "NO_EXHIBITION_FACT" || fact.reason === "NO_STRUCTURE" || fact.decision === "SOURCE_UNAVAILABLE") return [];
      const [preview] = previewCandidates([candidateFromFact(fact)], snapshot);
      const row = {
        artist: discovery.target.artist,
        title: fact.title,
        decision: fact.decision,
        reason: fact.reason,
        duplicate: fact.duplicate,
        sourceUrl: fact.provenance.sourceUrl,
        sourceName: fact.provenance.sourceName,
        identity: fact.participants.map((person) => ({ label: person.label, identity: person.identity, evidence: person.evidence })),
        country: fact.country,
        venue: fact.venue,
        pageNote: page.note,
        graph: preview
          ? {
            newExhibitions: preview.value.newExhibition ? 1 : 0,
            newParticipations: fact.participants.filter((person) => person.evidence === "EXPLICIT_PARTICIPANT").length,
            newArtists: preview.value.newArtist ? 1 : 0,
            newSpaces: preview.value.newSpace ? 1 : 0,
            newDirectPairs: preview.value.newArtistPairCount,
            new2HopPaths: preview.value.new2HopPaths,
            new3HopPaths: preview.value.new3HopPaths,
            componentMerge: preview.value.connectsTwoComponents,
            historyDensity: preview.value.chronologyValue,
            duplicate: preview.decision,
          }
          : null,
      };
      candidates.push(row);
      return [row];
    });
    const outcomes = [
      ...ownPages.map((page) => page.note),
      ...ownPages.flatMap((page) => page.facts.map((fact) => fact.reason)),
    ];
    const useful = discovery.candidates.length > 0
      || discovery.resolvedEntityId != null
      || discovery.rejectedEntityIds.length > 0
      || discovery.wrongPerson
      || ownPages.some((page) => page.facts.some((fact) => fact.decision === "REVIEW_QUEUE" || fact.decision === "AUTO_IMPORT" || fact.decision === "SOURCE_UNAVAILABLE"))
      || outcomes.some((outcome) => ["SOURCE_UNAVAILABLE", "INCOMPLETE_FACT", "NO_PARTICIPANT_LIST", "NO_EXHIBITION_FACT", "HIGH_CONFIDENCE", "REVIEW_QUEUE", "FOUNDATION_CV", "PRESS_PAGE"].includes(outcome));
    return {
      rank: discovery.target.rank,
      artist: discovery.target.artist,
      frontierType: discovery.target.frontierType,
      score: discovery.target.score,
      explanation: discovery.target.explanation,
      exhibitionCount: discovery.target.exhibitionCount,
      componentId: discovery.target.componentId,
      componentSize: discovery.target.componentSize,
      searchDemand: discovery.target.searchDemand,
      aliases: discovery.target.aliases,
      identitySlug: discovery.identitySlug,
      resolvedEntityId: discovery.wrongPerson ? null : discovery.resolvedEntityId,
      rejectedEntityIds: discovery.wrongPerson ? [...discovery.rejectedEntityIds, VOICE_ACTOR_ENTITY_ID] : discovery.rejectedEntityIds,
      identityBasis: discovery.identityBasis,
      wrongPerson: discovery.wrongPerson,
      sourceCandidates: discovery.candidates.map((item) => ({
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        sourceType: item.sourceType,
        discoveryMethod: item.discoveryMethod,
      })),
      pages: ownPages.map((page) => ({
        sourceUrl: page.sourceUrl,
        fetchable: page.fetchable,
        note: page.note,
        pageType: page.pageType,
      })),
      crawler: previews.map((preview) => ({
        title: preview.title,
        decision: preview.decision,
        reason: preview.reason,
        duplicate: preview.duplicate,
        sourceUrl: preview.sourceUrl,
      })),
      useful,
    };
  });
  return {
    targets,
    extraction: extractionCoverage(pages.map((page) => ({
      fetchable: page.fetchable,
      pageType: page.pageType,
      note: page.note,
      facts: page.facts.map((fact) => ({ title: fact.title, decision: fact.decision, reason: fact.reason, duplicate: fact.duplicate })),
    }))),
    candidates,
  };
}

export async function runFrontierAutopilot(input: { limit: number }): Promise<void> {
  const loaded = await loadGraph();
  const rows = buildGraphFrontier({ snapshot: loaded.snapshot, demand: loaded.demand }).map((row) => {
    const recorded = FRONTIER_CASES.find((item) => item.sourceUrl && (item.slug === row.artist || aliasLookupEqual(item.name, row.artist)));
    if (!recorded?.sourceUrl || row.candidateSources.includes(recorded.sourceUrl)) return row;
    return { ...row, candidateSources: [...row.candidateSources, recorded.sourceUrl] };
  });
  const ambiguous = FRONTIER_CASES.filter((item) => item.blocked).map((item) => item.name);
  const ranked = rankAutopilotFrontier({ rows, snapshot: loaded.snapshot, ambiguousArtists: ambiguous });
  const batch = selectAutopilotBatch(ranked, input.limit);
  const investigated = await investigate(batch, loaded.snapshot);
  const approval = (investigated.candidates as {
    decision: string;
    duplicate: string | null;
    reason: string;
    title: string;
    sourceUrl: string;
    sourceName: string;
    artist: string;
    identity: { label: string; identity: string; evidence: string }[];
    graph: { newExhibitions: number; newDirectPairs: number; componentMerge: boolean } | null;
  }[]).filter((candidate) => candidate.decision === "AUTO_IMPORT" && candidate.duplicate === "NEW");
  const report = {
    output: "GRAPH_FRONTIER_AUTOPILOT_V1",
    imported: false,
    productionWrites: 0,
    mode: "DRY_RUN",
    controlArtistsNotForced: [...CONTROL_ARTISTS],
    counts: summarizePublicGraph(loaded.snapshot, loaded.documentedTwoHopPaths),
    watched: watchFrontierPlacement(ranked),
    watchedInGraph: WATCHED_FRONTIER.map((name) => {
      const artist = loaded.snapshot.artists.find((item) => aliasLookupEqual(item.slug, name) || item.labels.some((label) => aliasLookupEqual(label, name)));
      return { name, present: Boolean(artist), slug: artist?.slug ?? null, exhibitions: artist?.exhibitionIds.length ?? 0 };
    }),
    batchSize: batch.length,
    ranking: ranked.slice(0, 20).map((row) => ({
      rank: row.rank,
      artist: row.artist,
      frontierType: row.frontierType,
      score: row.score,
      explanation: row.explanation,
      exhibitionCount: row.exhibitionCount,
      componentId: row.componentId,
      componentSize: row.componentSize,
      searchDemand: row.searchDemand,
      aliases: row.aliases,
      knownSourceCandidates: row.knownSourceCandidates,
      previousOutcomes: row.previousOutcomes,
    })),
    targets: investigated.targets,
    extraction: investigated.extraction,
    candidates: investigated.candidates,
    nextGrowthBatch: approval.slice(0, 15),
    usefulTargets: (investigated.targets as { useful: boolean }[]).filter((target) => target.useful).length,
  };
  console.log(JSON.stringify(report));
  await prisma.$disconnect();
}
