import { fetchText } from "../src/http";
import { writeJson } from "../src/io";
import { compactName, tokenKey } from "../src/resolve";
import { buildSeedArtists, type SeedArtist } from "../src/seed";

type WikidataEntity = {
  labels?: Record<string, { value?: string }>;
  descriptions?: Record<string, { value?: string }>;
  aliases?: Record<string, { value?: string }[]>;
  claims?: {
    P569?: { mainsnak?: { datavalue?: { value?: { time?: string; precision?: number } } } }[];
  };
};

const ARTIST_DESCRIPTION = /artist|painter|sculptor|photographer|visual artist|미술가|작가|조각가|사진작가|사진가|화가|시각예술가/i;
const NON_ARTIST = /singer|footballer|politician|actor|idol|entrepreneur|businessperson|시인|소설가|정치인|가수|배우/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetchText(url, 25000);
    if (response.status === 429 || response.status >= 500) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (response.status !== 200) throw new Error(`${response.status} ${url}`);
    return JSON.parse(response.text) as unknown;
  }
  throw new Error(`failed ${url}`);
}

function entityTexts(entity: WikidataEntity): string[] {
  const values: string[] = [];
  for (const language of ["en", "ko"]) {
    const label = entity.labels?.[language]?.value;
    if (label) values.push(label);
    for (const alias of entity.aliases?.[language] ?? []) {
      if (alias.value) values.push(alias.value);
    }
  }
  return values;
}

function descriptionOf(entity: WikidataEntity): string {
  return [entity.descriptions?.en?.value, entity.descriptions?.ko?.value].filter(Boolean).join(" ");
}

function birthYearOf(entity: WikidataEntity): number | null {
  const value = entity.claims?.P569?.[0]?.mainsnak?.datavalue?.value;
  if (!value?.time || (value.precision ?? 0) < 9) return null;
  const year = Number(value.time.replace("+", "").slice(0, 4));
  return Number.isInteger(year) ? year : null;
}

function nameHits(artist: SeedArtist, entity: WikidataEntity): boolean {
  const targets = [artist.canonicalKoreanName, ...artist.romanizedNames, ...artist.otherAliases];
  const texts = entityTexts(entity);
  return targets.some((target) =>
    texts.some((text) => compactName(text) === compactName(target) || tokenKey(text) === tokenKey(target)),
  );
}

async function searchIds(term: string, language: string): Promise<string[]> {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", term);
  url.searchParams.set("language", language);
  url.searchParams.set("type", "item");
  url.searchParams.set("limit", "5");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxlag", "5");
  const payload = (await getJson(url.toString())) as { search?: { id: string }[] };
  await sleep(150);
  return (payload.search ?? []).map((item) => item.id);
}

async function main(): Promise<void> {
  throw new Error(
    "Refusing to call /w/api.php. robots.txt Disallow: /w/ matches that path. Use scripts/enrich-wikidata-entitydata.ts.",
  );
  const artists = buildSeedArtists();
  const idsByArtist = new Map<string, string[]>();
  const allIds = new Set<string>();
  for (const artist of artists) {
    const ids = new Set<string>();
    const queries = [
      { term: artist.romanizedNames[0], language: "en" },
      { term: artist.canonicalKoreanName, language: "ko" },
      ...artist.otherAliases.map((term) => ({ term, language: "en" })),
    ];
    for (const query of queries) {
      try {
        for (const id of await searchIds(query.term, query.language)) ids.add(id);
      } catch (error) {
        console.error(`search failed ${artist.pilotId} ${query.term}: ${String(error)}`);
      }
    }
    idsByArtist.set(artist.pilotId, [...ids]);
    for (const id of ids) allIds.add(id);
  }

  const entities = new Map<string, WikidataEntity>();
  const idList = [...allIds];
  for (let index = 0; index < idList.length; index += 40) {
    const slice = idList.slice(index, index + 40);
    const url = new URL("https://www.wikidata.org/w/api.php");
    url.searchParams.set("action", "wbgetentities");
    url.searchParams.set("ids", slice.join("|"));
    url.searchParams.set("props", "labels|descriptions|aliases|claims");
    url.searchParams.set("languages", "en|ko");
    url.searchParams.set("format", "json");
    url.searchParams.set("maxlag", "5");
    const payload = (await getJson(url.toString())) as { entities?: Record<string, WikidataEntity> };
    for (const [id, entity] of Object.entries(payload.entities ?? {})) entities.set(id, entity);
    await sleep(200);
  }

  const lookup = artists.map((artist) => {
    const matches = (idsByArtist.get(artist.pilotId) ?? [])
      .map((id) => ({ id, entity: entities.get(id) }))
      .filter((item): item is { id: string; entity: WikidataEntity } => Boolean(item.entity))
      .filter((item) => nameHits(artist, item.entity))
      .filter((item) => {
        const description = descriptionOf(item.entity);
        return ARTIST_DESCRIPTION.test(description) && !NON_ARTIST.test(description);
      });
    const status = matches.length === 1 ? "UNIQUE" : matches.length > 1 ? "AMBIGUOUS" : "UNRESOLVED";
    const chosen = status === "UNIQUE" ? matches[0] : null;
    return {
      pilotId: artist.pilotId,
      canonicalKoreanName: artist.canonicalKoreanName,
      romanized: artist.romanizedNames[0],
      status,
      qid: chosen?.id ?? null,
      birthYear: chosen ? birthYearOf(chosen.entity) : null,
      label: chosen ? entityTexts(chosen.entity).slice(0, 4) : [],
      description: chosen ? descriptionOf(chosen.entity) : null,
      candidates: matches.map((item) => ({
        id: item.id,
        description: descriptionOf(item.entity),
        birthYear: birthYearOf(item.entity),
      })),
    };
  });

  writeJson("data/review/identity-lookup.json", {
    retrievedAt: new Date().toISOString(),
    source: "https://www.wikidata.org/w/api.php",
    lookup,
  });
  const counts = lookup.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify(counts));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
