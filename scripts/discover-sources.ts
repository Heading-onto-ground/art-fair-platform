import { readFileSync } from "fs";
import { Client } from "pg";
import type { GrowthSnapshot } from "../lib/history/growth";
import { aicExactAgent, clevelandMatchedWorks, classifyFetchedPage, tateResultLinks } from "../lib/history/institutionPages";
import { envValue } from "../lib/history/runtimeEnv";
import {
  VOICE_ACTOR_ENTITY_ID,
  aliasesFor,
  canonicalArtistName,
  crawlerCanFetch,
  discoverTrustedSources,
  discoveryReadiness,
  extractionCoverage,
  sourceDiscoveryAcceptance,
  summarizeCrawlerDryRun,
  type DiscoveryEntity,
  type DiscoveryInstitution,
  CONTROL_ARTISTS,
  DISCOVERED_TRUSTED_SOURCE_CANDIDATES,
} from "../lib/history/sourceDiscovery";
import { classifyTrustedUrl, crawlArtists, crawlTrustedPage, fetchTrustedDocument, type CrawlFact } from "../lib/history/trustedCrawl";

const USER_AGENT = "ROB-source-discovery/1.0 (art-history preview; identity check only)";
const DUPLICATE_CONTROL_URL = "https://www.kukjegallery.com/exhibitions/view?seq=245";

function readEnv(name: string): string {
  const files: string[] = [];
  for (const path of [".env.local", ".env"]) {
    try {
      files.push(readFileSync(path, "utf8"));
    } catch {
      files.push("");
    }
  }
  return envValue(name, files);
}

async function loadSnapshot(databaseUrl: string): Promise<GrowthSnapshot> {
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const entities = await client.query<{ slug: string; canonicalName: string; nativeName: string | null }>(
      `SELECT slug, "canonicalName", "nativeName" FROM "ArtistEntity"`,
    );
    const aliasRows = await client.query<{ slug: string; label: string }>(
      `SELECT a.slug, l.label FROM "ArtistAlias" l JOIN "ArtistEntity" a ON a.id = l."artistEntityId"`,
    );
    const shows = await client.query<{ id: string; title: string; year: number | null; space: string | null; city: string | null }>(
      `SELECT e.id, e.title, m."startYear" AS year, s.name AS space, e.city
       FROM "Exhibition" e
       LEFT JOIN "ExhibitionHistoryMeta" m ON m."exhibitionId" = e.id
       LEFT JOIN "Space" s ON s.id = e."spaceId"`,
    );
    const parts = await client.query<{ exhibitionId: string; slug: string }>(
      `SELECT p."exhibitionId", a.slug FROM "HistoryParticipation" p JOIN "ArtistEntity" a ON a.id = p."artistEntityId"`,
    );
    const labels = new Map<string, string[]>();
    for (const row of entities.rows) labels.set(row.slug, [row.canonicalName, row.nativeName].filter((value): value is string => Boolean(value)));
    for (const row of aliasRows.rows) labels.get(row.slug)?.push(row.label);
    const byExhibition = new Map<string, string[]>();
    const artistShows = new Map<string, string[]>();
    for (const row of parts.rows) {
      const list = byExhibition.get(row.exhibitionId) ?? [];
      list.push(row.slug);
      byExhibition.set(row.exhibitionId, list);
      const showsForArtist = artistShows.get(row.slug) ?? [];
      showsForArtist.push(row.exhibitionId);
      artistShows.set(row.slug, showsForArtist);
    }
    return {
      artists: [...labels.entries()].map(([slug, names]) => ({ slug, labels: names, exhibitionIds: artistShows.get(slug) ?? [] })),
      exhibitions: shows.rows.map((row) => ({ id: row.id, title: row.title, year: row.year, space: row.space, city: row.city, artistSlugs: byExhibition.get(row.id) ?? [] })),
      unresolved: [],
    };
  } finally {
    await client.end();
  }
}

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
  if (!response.ok || text.startsWith("You are making too many requests")) {
    throw new Error("WIKIDATA_RATE_LIMIT");
  }
  return JSON.parse(text) as unknown;
}

function option(argv: string[], name: string): string {
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : "";
  return value && !value.startsWith("--") ? value : "";
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--write") || argv.includes("--import")) {
    console.error("PRODUCTION_WRITE_DISABLED");
    process.exit(2);
  }
  const only = option(argv, "--artist");
  const slugs = only ? [only] : [...CONTROL_ARTISTS];
  const last = { at: 0 };
  const foundIds = new Map<string, string[]>();
  for (const slug of slugs) {
    const name = canonicalArtistName(slug);
    const language = /[가-힣]/.test(name) ? "ko" : "en";
    const payload = await wikidata(`action=wbsearchentities&search=${encodeURIComponent(name)}&language=${language}&format=json&limit=8`, last) as {
      search?: { id?: string }[];
    };
    foundIds.set(slug, (payload.search ?? []).flatMap((item) => item.id ? [item.id] : []));
  }
  const artistIds = [...new Set([...foundIds.values()].flat())];
  const artistEntities = new Map<string, ApiEntity>();
  if (artistIds.length > 0) {
    const payload = await wikidata(`action=wbgetentities&ids=${artistIds.join("|")}&props=labels|aliases|descriptions|claims&languages=en|ko&format=json`, last) as {
      entities?: Record<string, ApiEntity>;
    };
    for (const [id, entity] of Object.entries(payload.entities ?? {})) artistEntities.set(id, entity);
  }
  const artists = slugs.map((slug) => ({
    slug,
    entities: (foundIds.get(slug) ?? []).flatMap((id) => {
      const entity = artistEntities.get(id);
      return entity ? [toArtist(id, entity)] : [];
    }),
  }));
  const collectionIds = [...new Set(artists.flatMap((artist) => artist.entities.flatMap((entity) => entity.collectionIds)))];
  const institutions: DiscoveryInstitution[] = [];
  if (collectionIds.length > 0) {
    const payload = await wikidata(`action=wbgetentities&ids=${collectionIds.join("|")}&props=labels|descriptions|claims&languages=en|ko&format=json`, last) as {
      entities?: Record<string, ApiEntity>;
    };
    for (const [id, entity] of Object.entries(payload.entities ?? {})) institutions.push(toInstitution(id, entity));
  }
  const discoveries = artists.map((artist) => {
    const found = discoverTrustedSources({ artistId: artist.slug, entities: artist.entities, institutions });
    return {
      artistId: artist.slug,
      ...found,
      wrongPersonLinks: found.resolvedEntityId === VOICE_ACTOR_ENTITY_ID ? 1 : 0,
    };
  });
  const databaseUrl = readEnv("DATABASE_URL");
  const crawlArtistsForDryRun = crawlArtists([]);
  let snapshot: GrowthSnapshot = {
    artists: crawlArtistsForDryRun.map((artist) => ({ ...artist, exhibitionIds: [] as string[] })),
    exhibitions: [],
    unresolved: [],
  };
  let snapshotReady = false;
  if (databaseUrl) {
    try {
      snapshot = await loadSnapshot(databaseUrl);
      snapshotReady = true;
    } catch {
      snapshotReady = false;
    }
  }
  const cache = new Map();
  const lastByHost = new Map<string, number>();
  const fetchState = { cache, lastByHost };
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const queued = new Map<string, string[]>();
  const addUrl = (artistId: string, url: string) => {
    const list = queued.get(artistId) ?? [];
    if (!list.includes(url)) list.push(url);
    queued.set(artistId, list);
  };
  for (const discovery of discoveries) {
    for (const item of discovery.candidates) addUrl(discovery.artistId, item.sourceUrl);
    const aliases = aliasesFor(discovery.artistId);
    if (discovery.candidates.some((item) => item.sourceDomain === "tate.org.uk")) {
      const search = await fetchTrustedDocument(`https://www.tate.org.uk/search?q=${encodeURIComponent(canonicalArtistName(discovery.artistId))}`, fetchState);
      const links = search.html ? tateResultLinks(search.html) : [];
      for (const link of links.filter((item) => classifyFetchedPage(item) === "EXHIBITION").slice(0, 2)) addUrl(discovery.artistId, link);
      const mentioned = (item: string) => aliases.some((alias) => {
        const token = alias.toLowerCase().replace(/[\s\u2010-\u2014-]+/g, "-");
        return token.length >= 6 && item.toLowerCase().includes(token);
      });
      for (const link of links.filter((item) => classifyFetchedPage(item) === "ARTIST_PROFILE" && mentioned(item)).slice(0, 1)) addUrl(discovery.artistId, link);
      for (const link of links.filter((item) => classifyFetchedPage(item) === "COLLECTION_OBJECT" && mentioned(item)).slice(0, 1)) addUrl(discovery.artistId, link);
    }
    if (discovery.candidates.some((item) => item.sourceDomain === "clevelandart.org")) {
      for (const alias of aliases) {
        const works = await fetchTrustedDocument(`https://openaccess-api.clevelandart.org/api/artworks/?artists=${encodeURIComponent(alias)}&limit=5`, fetchState);
        const matched = clevelandMatchedWorks(works.json, aliases);
        if (matched.exhibitionIds.length === 0 && matched.objectUrls.length === 0) continue;
        for (const url of matched.objectUrls.filter((item) => classifyTrustedUrl(item)).slice(0, 1)) addUrl(discovery.artistId, url);
        for (const id of matched.exhibitionIds.slice(0, 2)) addUrl(discovery.artistId, `https://openaccess-api.clevelandart.org/api/exhibitions/${id}`);
        break;
      }
    }
    if (discovery.candidates.some((item) => item.sourceDomain === "artic.edu")) {
      const agents = await fetchTrustedDocument(`https://api.artic.edu/api/v1/agents/search?q=${encodeURIComponent(canonicalArtistName(discovery.artistId))}&limit=5&fields=id,title`, fetchState);
      const agent = aicExactAgent(agents.json, aliases);
      if (agent) addUrl(discovery.artistId, `https://api.artic.edu/api/v1/agents/${agent.id}`);
    }
  }
  const factsByUrl = new Map<string, { fetchable: boolean; note: string; facts: CrawlFact[] }>();
  const crawlOne = async (url: string) => {
    if (factsByUrl.has(url)) return factsByUrl.get(url)!;
    if (!crawlerCanFetch(url)) {
      const missed = { fetchable: false, note: "HOST_OUTSIDE_V1", facts: [] as CrawlFact[] };
      factsByUrl.set(url, missed);
      return missed;
    }
    const page = await fetchTrustedDocument(url, fetchState);
    if (page.blocked || (!page.html && page.json === undefined)) {
      const missed = { fetchable: false, note: page.blocked ?? "SOURCE_UNAVAILABLE", facts: [] as CrawlFact[] };
      factsByUrl.set(url, missed);
      return missed;
    }
    const facts = crawlTrustedPage({
      url,
      retrievedAt,
      html: page.html,
      json: page.json,
      artists: snapshot.artists,
      snapshot,
      snapshotReady,
    });
    const parsed = { fetchable: true, note: facts[0]?.reason ?? "PARSED", facts };
    factsByUrl.set(url, parsed);
    return parsed;
  };
  const artistPages = new Map<string, { sourceUrl: string; fetchable: boolean; note: string; pageType: string | null; summary: ReturnType<typeof summarizeCrawlerDryRun>; facts: CrawlFact[] }[]>();
  for (const [artistId, urls] of queued) {
    const pages = [];
    for (const url of urls) {
      const parsed = await crawlOne(url);
      pages.push({
        sourceUrl: url,
        fetchable: parsed.fetchable,
        note: parsed.note,
        pageType: parsed.facts[0]?.pageType ?? null,
        summary: summarizeCrawlerDryRun(parsed.facts),
        facts: parsed.facts,
      });
    }
    artistPages.set(artistId, pages);
  }
  const duplicateControl = await crawlOne(DUPLICATE_CONTROL_URL);
  const controlFacts = duplicateControl.facts.map((fact) => ({
    adapter: classifyTrustedUrl(fact.provenance.sourceUrl)?.adapter ?? "",
    pageType: fact.pageType,
    title: fact.title,
    decision: fact.decision,
    duplicate: fact.duplicate,
    reason: fact.reason,
  }));
  const provenanceUrls = [...artistPages.values()].flatMap((pages) => pages.flatMap((page) => page.facts.map((fact) => fact.provenance.sourceUrl)));
  const searchProvenanceCount = provenanceUrls.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname === "/search" || parsed.pathname.startsWith("/search/") || ["google.com", "wikipedia.org", "wikidata.org"].some((host) => parsed.hostname.replace(/^www\./, "") === host || parsed.hostname.endsWith(`.${host}`));
    } catch {
      return false;
    }
  }).length;
  const coveragePages = [...artistPages.values()].flatMap((pages) => pages.map((page) => ({
    fetchable: page.fetchable,
    pageType: page.pageType,
    note: page.note,
    facts: page.facts.map((fact) => ({
      title: fact.title,
      decision: fact.decision,
      reason: fact.reason,
      duplicate: fact.duplicate,
    })),
  })));
  const acceptance = sourceDiscoveryAcceptance({
    controlArtists: slugs.length,
    artistsWithTrustedCandidate: discoveries.filter((discovery) => discovery.candidates.length > 0).length,
    wrongPersonLinks: discoveries.reduce((sum, discovery) => sum + discovery.wrongPersonLinks, 0),
    searchResultProvenance: searchProvenanceCount,
    resolvedVoiceActor: discoveries.some((discovery) => discovery.resolvedEntityId === VOICE_ACTOR_ENTITY_ID),
    crawlerSafetyRegressions: 0,
    productionWrites: 0,
  });
  const readiness = discoveryReadiness(discoveries);
  console.log(JSON.stringify({
    output: DISCOVERED_TRUSTED_SOURCE_CANDIDATES,
    imported: false,
    snapshot: snapshotReady ? "LOADED" : "UNAVAILABLE",
    readiness,
    acceptance,
    extraction: extractionCoverage(coveragePages),
    duplicateControl: {
      sourceUrl: DUPLICATE_CONTROL_URL,
      fetchable: duplicateControl.fetchable,
      note: duplicateControl.note,
      facts: controlFacts,
    },
    artists: discoveries.map((discovery) => ({
      artistId: discovery.artistId,
      canonicalArtistName: canonicalArtistName(discovery.artistId),
      resolvedEntityId: discovery.resolvedEntityId,
      identityBasis: discovery.identityBasis,
      rejectedEntityIds: discovery.rejectedEntityIds,
      candidates: discovery.candidates,
      pages: (artistPages.get(discovery.artistId) ?? []).map((page) => ({
        sourceUrl: page.sourceUrl,
        fetchable: page.fetchable,
        note: page.note,
        pageType: page.pageType,
        summary: page.summary,
        facts: page.facts.map((fact) => ({
          title: fact.title,
          decision: fact.decision,
          reason: fact.reason,
          duplicate: fact.duplicate,
          pageType: fact.pageType,
          venue: fact.venue,
          city: fact.city,
          country: fact.country,
          participants: fact.participants.map((person) => ({ label: person.label, identity: person.identity, evidence: person.evidence })),
        })),
      })),
    })),
  }, null, 2));
  if (acceptance !== "ROB_SOURCE_DISCOVERY_V1_ACCEPTED") process.exitCode = 2;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "SOURCE_DISCOVERY_FAILED";
  console.error(message);
  process.exit(1);
});
