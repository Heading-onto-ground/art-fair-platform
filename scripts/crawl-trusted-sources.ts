import { readFileSync } from "fs";
import { Client } from "pg";
import type { GrowthSnapshot } from "../lib/history/growth";
import { envValue } from "../lib/history/runtimeEnv";
import {
  classifyTrustedUrl,
  crawlArtists,
  crawlTrustedPage,
  fetchTrustedDocument,
  trustedCrawlReport,
  trustedImportBatch,
  unavailableFact,
  type CrawlFact,
} from "../lib/history/trustedCrawl";

type Seed = { url: string; slug?: string; labels?: string[] };

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

function withLabels(snapshot: GrowthSnapshot, artists: { slug: string; labels: string[] }[]): GrowthSnapshot {
  const next = snapshot.artists.map((artist) => ({ ...artist, labels: [...artist.labels] }));
  for (const artist of artists) {
    const found = next.find((item) => item.slug === artist.slug);
    if (!found) {
      next.push({ slug: artist.slug, labels: [...artist.labels], exhibitionIds: [] });
      continue;
    }
    for (const label of artist.labels) if (!found.labels.includes(label)) found.labels.push(label);
  }
  return { ...snapshot, artists: next };
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

function visible(fact: CrawlFact) {
  return {
    title: fact.title,
    year: fact.startYear,
    venue: fact.venue,
    city: fact.city,
    country: fact.country,
    confidence: fact.confidence,
    decision: fact.decision,
    reason: fact.reason,
    duplicate: fact.duplicate,
    alreadyRecorded: fact.alreadyRecorded,
    graph: fact.graph,
    participants: fact.participants,
    curators: fact.curators,
    provenance: fact.provenance,
    fieldProvenance: fact.fieldProvenance,
  };
}

function remember(snapshot: GrowthSnapshot, fact: CrawlFact): GrowthSnapshot {
  if (fact.decision !== "AUTO_IMPORT" || fact.duplicate !== "NEW" || !fact.title || fact.startYear == null) return snapshot;
  return {
    ...snapshot,
    exhibitions: [
      ...snapshot.exhibitions,
      {
        id: fact.pilotRecordId,
        title: fact.title,
        year: fact.startYear,
        space: fact.venue,
        city: fact.city,
        artistSlugs: fact.participants.flatMap((person) => (person.identity === "EXACT" && person.slug ? [person.slug] : [])),
      },
    ],
  };
}

function optionValue(argv: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== name) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) continue;
    values.push(value);
  }
  return values;
}

function sourceHost(source: string): string | null {
  const key = source.toLowerCase();
  if (key === "kukje") return "kukjegallery.com";
  if (key === "hyundai") return "galleryhyundai.com";
  if (key === "arario") return "arariogallery.com";
  if (key === "mmca") return "mmca.go.kr";
  if (key === "naa" || key === "foundation") return "naa.go.kr";
  return null;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--write") || argv.includes("--import")) {
    console.error("PRODUCTION_WRITE_DISABLED");
    process.exit(2);
  }
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const seeds = JSON.parse(readFileSync("data/history/trusted-crawl-seeds.json", "utf8")) as Seed[];
  const extra: Seed[] = optionValue(argv, "--url").map((url) => ({ url }));
  const source = optionValue(argv, "--source")[0] ?? "";
  const artist = optionValue(argv, "--artist")[0] ?? "";
  const limit = Number(optionValue(argv, "--limit")[0] ?? "10");
  const host = source ? sourceHost(source) : null;
  let pages = [...seeds, ...extra].filter((seed) => {
    if (artist && seed.slug && seed.slug !== artist) return false;
    if (host) return classifyTrustedUrl(seed.url)?.host === host;
    return true;
  });
  if (!Number.isFinite(limit) || limit < 1) {
    console.error("INVALID_LIMIT");
    process.exit(2);
  }
  pages = pages.slice(0, limit);
  const artists = crawlArtists(pages);
  let snapshot: GrowthSnapshot = { artists: artists.map((row) => ({ ...row, exhibitionIds: [] })), exhibitions: [], unresolved: [] };
  let snapshotReady = false;
  const databaseUrl = readEnv("DATABASE_URL");
  if (databaseUrl) {
    try {
      snapshot = withLabels(await loadSnapshot(databaseUrl), artists);
      snapshotReady = true;
    } catch {
      snapshotReady = false;
    }
  }
  const facts: CrawlFact[] = [];
  const fetches: { host: string; requests: number; blocked?: string }[] = [];
  const cache = new Map();
  const lastByHost = new Map<string, number>();
  for (const seed of pages) {
    let page: { html?: string; json?: unknown; blocked?: string; requests: number; host: string };
    try {
      page = await fetchTrustedDocument(seed.url, { cache, lastByHost });
    } catch {
      page = { blocked: "SOURCE_UNAVAILABLE", requests: 1, host: classifyTrustedUrl(seed.url)?.host ?? "untrusted" };
    }
    fetches.push({ host: page.host, requests: page.requests, blocked: page.blocked });
    if (page.blocked === "SOURCE_UNAVAILABLE") {
      facts.push(unavailableFact({ url: seed.url, retrievedAt, artists: snapshot.artists, snapshot, snapshotReady }));
      continue;
    }
    const parsed = crawlTrustedPage({
      url: seed.url,
      retrievedAt,
      html: page.html,
      json: page.json,
      subjectLabel: seed.labels?.[0] ?? null,
      artists: snapshot.artists,
      snapshot,
      snapshotReady,
    });
    const next = page.blocked && page.blocked !== "LOW_AUTHORITY"
      ? parsed.map((fact) => ({ ...fact, confidence: "LOW" as const, decision: "HOLD" as const, reason: page.blocked ?? fact.reason }))
      : parsed;
    facts.push(...next);
    for (const fact of next) snapshot = remember(snapshot, fact);
  }
  const report = trustedCrawlReport(facts);
  const requestsByDomain: Record<string, number> = {};
  for (const row of fetches) requestsByDomain[row.host] = (requestsByDomain[row.host] ?? 0) + row.requests;
  const batch = trustedImportBatch(facts, retrievedAt, snapshot);
  console.log(JSON.stringify({
    level: 1,
    imported: false,
    snapshot: snapshotReady ? "LOADED" : "UNAVAILABLE",
    pagesFetched: fetches.filter((row) => row.requests > 0).length,
    pagesParsed: fetches.filter((row) => row.blocked !== "SOURCE_UNAVAILABLE").length,
    failures: fetches.filter((row) => row.blocked === "SOURCE_UNAVAILABLE").length,
    requestsByDomain,
    report,
    facts: facts.map(visible),
    batch,
  }, null, 2));
}

main().catch(() => {
  console.error("TRUSTED_CRAWL_FAILED");
  process.exit(1);
});

