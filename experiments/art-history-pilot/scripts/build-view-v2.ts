import { mkdirSync, writeFileSync } from "fs";
import { isRecordedExhibition, type ExhibitionRecord } from "../src/claims";
import { readJson } from "../src/io";
import { pilotPath } from "../src/paths";
import { historySignature, seoBucket, timelineFraction } from "../src/product";
import { compactName } from "../src/resolve";
import type { SeedArtist } from "../src/seed";

type IdentityRow = {
  pilotId: string;
  status: string;
  birthYear: number | null;
  aliases: string[];
};

type EventModel = {
  id: string;
  title: string;
  when: string;
  precision: string;
  fraction: number;
  precise: boolean;
  year: number | null;
  venue: string | null;
  city: string | null;
  curators: string[];
  start: string | null;
  end: string | null;
  artists: { id: string | null; name: string }[];
  sources: string[];
  origin: string;
  verification: string;
  provenance: string;
};

type PersonModel = {
  id: string;
  name: string;
  korean: string;
  search: string;
  birthYear: number | null;
  count: number;
  bucket: string;
  signature: number[];
  earliest: string | null;
  events: EventModel[];
};

function namesOf(artist: SeedArtist): string[] {
  return [artist.canonicalKoreanName, ...artist.romanizedNames, ...artist.otherAliases];
}

function matches(artist: SeedArtist, name: string): boolean {
  const target = compactName(name);
  return namesOf(artist).some((label) => compactName(label) === target);
}

function whenLabel(record: ExhibitionRecord): string {
  if (!record.start) return "Date not recorded";
  return record.end ? `${record.start.value} – ${record.end.value}` : record.start.value;
}

function buildPeople(artists: SeedArtist[], records: ExhibitionRecord[], identity: IdentityRow[]): PersonModel[] {
  const international = artists.filter((artist) => artist.cohort === "INTERNATIONAL");
  const accepted = records.filter(isRecordedExhibition);
  const birth = new Map(
    identity.filter((row) => row.status === "QID_CONFIRMED" && row.birthYear).map((row) => [row.pilotId, row.birthYear]),
  );
  const alias = new Map(
    identity.filter((row) => row.status === "QID_CONFIRMED").map((row) => [row.pilotId, row.aliases ?? []]),
  );
  const people = international.map((artist) => {
    const events = accepted.filter((record) => record.artistNames.some((name) => matches(artist, name)));
    const years = events.map((record) => Number(record.start?.value.slice(0, 4))).filter((year) => year >= 1800);
    const min = years.length ? Math.min(...years) : 1960;
    const max = years.length ? Math.max(...years) : 2026;
    const sorted = [...events].sort((a, b) => (a.start?.value ?? "").localeCompare(b.start?.value ?? ""));
    return {
      artist,
      min,
      max,
      sorted,
    };
  });
  return people.map(({ artist, min, max, sorted }) => ({
    id: artist.pilotId,
    name: artist.romanizedNames[0],
    korean: artist.canonicalKoreanName,
    search: [...namesOf(artist), ...(alias.get(artist.pilotId) ?? [])].join(" "),
    birthYear: birth.get(artist.pilotId) ?? artist.birthYear,
    count: sorted.length,
    bucket: seoBucket(sorted.length),
    signature: historySignature(sorted.map((record) => record.start?.value ?? "").filter(Boolean)),
    earliest: sorted[0]?.start?.value ?? null,
    events: sorted.map((record) => {
      const placed = record.start
        ? timelineFraction(record.start.value, record.start.precision, min, max)
        : { fraction: 0, precise: false };
      const seen = new Set<string>();
      const linked = record.artistNames.flatMap((name) => {
        const found = international.find((item) => matches(item, name));
        const id = found?.pilotId ?? null;
        if (id && seen.has(id)) return [];
        if (id) seen.add(id);
        return [{ id, name: found?.romanizedNames[0] ?? name }];
      });
      const city = record.city && record.city.length <= 40 ? record.city : null;
      return {
        id: record.id,
        title: record.title,
        when: whenLabel(record),
        precision: record.datePrecision,
        fraction: placed.fraction,
        precise: placed.precise,
        year: record.start ? Number(record.start.value.slice(0, 4)) : null,
        venue: record.venueName,
        city,
        start: record.start?.value ?? null,
        end: record.end?.value ?? null,
        curators: record.curatorNames,
        artists: linked,
        sources: [record.sourceUrl, ...(record.additionalSources ?? [])].filter(Boolean),
        origin: "ROB_RESEARCHED",
        verification: "OFFICIAL_SOURCE",
        provenance: "Official source",
      };
    }),
  }));
}

function html(data: PersonModel[]): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ROB</title>
  <meta name="description" content="Search an artist. See their journey." />
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f6f4f0; color: #161616; font-family: "Palatino Linotype", Palatino, Georgia, serif; }
    button, input { font: inherit; color: inherit; }
    a { color: inherit; }
    header, main, #human { width: min(1080px, calc(100% - 40px)); margin: 0 auto; }
    header { padding: 48px 0 12px; }
    .mark { letter-spacing: 0.22em; font-size: 13px; }
    h1 { font-weight: 400; font-size: 42px; line-height: 1.15; margin: 18px 0; }
    .search { width: 100%; border: 0; border-bottom: 1px solid #161616; background: transparent; padding: 12px 0; font-family: system-ui, sans-serif; font-size: 18px; }
    .hint { margin: 22px 0; font-family: system-ui, sans-serif; font-size: 13px; }
    .hint button { background: none; border: 0; padding: 0; text-decoration: underline; cursor: pointer; }
    .results { display: grid; gap: 10px; margin: 18px 0 36px; }
    .result, .artist, .moment, .log { background: #fff; border: 1px solid #e4e0d8; }
    .result { display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 14px 16px; text-align: left; cursor: pointer; }
    .result small, .meta, .log, .moment p, .sources { font-family: system-ui, sans-serif; }
    .korean { display: block; color: #5e5a55; }
    .signature { display: flex; align-items: end; gap: 3px; height: 28px; }
    .signature i { display: block; width: 6px; background: #161616; border-radius: 99px; }
    .artist { padding: 28px 24px 36px; margin-bottom: 18px; }
    .crumbs { font-family: system-ui, sans-serif; font-size: 12px; color: #5e5a55; }
    .crumbs button { background: none; border: 0; padding: 0; margin-right: 8px; text-decoration: underline; cursor: pointer; }
    .tabs { display: flex; gap: 18px; margin: 18px 0; font-family: system-ui, sans-serif; font-size: 12px; letter-spacing: 0.14em; }
    .tabs span { border-bottom: 1px solid #161616; padding-bottom: 4px; }
    .track { position: relative; height: 120px; margin: 28px 0 8px; }
    .axis { position: absolute; left: 0; right: 0; top: 58px; border-top: 1px solid #161616; }
    .dot { position: absolute; top: 52px; width: 12px; height: 12px; border: 1px solid #161616; background: #161616; border-radius: 99px; transform: translateX(-50%); cursor: pointer; padding: 0; }
    .dot.uncertain { background: #fff; }
    .yearmark { position: absolute; top: 74px; transform: translateX(-50%); font-family: system-ui, sans-serif; font-size: 11px; }
    .vertical { display: none; }
    .moment { padding: 18px 20px 22px; }
    .constellation { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .constellation button, .sources a { border: 1px solid #161616; background: #fff; padding: 8px 10px; text-decoration: none; font-family: system-ui, sans-serif; font-size: 13px; cursor: pointer; }
    .log { margin: 28px 0 64px; padding: 14px 16px; }
    .log button { margin-right: 8px; }
    .empty { color: #5e5a55; }
    .prov, .demo, form label, .questions { font-family: system-ui, sans-serif; font-size: 13px; }
    .prov { border: 0; background: none; padding: 0; text-decoration: underline; cursor: pointer; }
    .demo { letter-spacing: 0.08em; font-size: 11px; }
    form { display: grid; gap: 10px; margin-top: 16px; }
    input, select, textarea { width: 100%; border: 1px solid #161616; background: #fff; padding: 8px 10px; font-family: system-ui, sans-serif; font-size: 14px; }
    .questions { display: grid; gap: 12px; }
    .questions div { display: flex; gap: 8px; flex-wrap: wrap; }
    @media (max-width: 720px) {
      h1 { font-size: 32px; }
      .track { display: none; }
      .vertical { display: block; margin: 12px 0 0; }
      .vertical article { border-left: 1px solid #161616; margin: 0 0 0 6px; padding: 0 0 18px 16px; }
      .vertical button { background: none; border: 0; padding: 0; text-align: left; cursor: pointer; }
      .vertical .node { display: inline-block; width: 9px; height: 9px; border: 1px solid #161616; background: #161616; border-radius: 99px; margin-left: -21px; margin-right: 8px; }
      .vertical .node.uncertain { background: #fff; }
    }
  </style>
</head>
<body>
  <header>
    <div class="mark">ROB</div>
    <h1>Search an artist.<br>See their journey.</h1>
    <input id="q" class="search" type="search" placeholder="Search an artist..." autocomplete="off" />
    <p class="hint"><button id="start" type="button">Are you an artist? Start your history →</button></p>
    <div id="results" class="results"></div>
  </header>
  <main id="stage" hidden>
    <article class="artist" id="artist"></article>
    <section class="moment" id="moment" hidden></section>
    <section class="moment" id="composer" hidden></section>
    <section class="log">
      <p>This pilot keeps a local session log in this browser. It does not call an analytics service.</p>
      <button id="clear" type="button">Clear log</button>
      <button id="clear-hybrid" type="button">Clear prototype additions</button>
      <button id="export" type="button">Export log</button>
      <pre id="log"></pre>
    </section>
  </main>
  <section class="log" id="human">
    <p>Human test. Answers stay in this browser.</p>
    <div class="questions" id="questions"></div>
    <button id="save-answers" type="button">Save answers</button>
  </section>
  <script>window.ROB_PEOPLE = ${json};</script>
  <script src="app.js"></script>
</body>
</html>`;
}

function distinctIncidences(artists: SeedArtist[], records: ExhibitionRecord[]): number {
  const international = artists.filter((artist) => artist.cohort === "INTERNATIONAL");
  return records.filter(isRecordedExhibition).reduce((sum, record) => {
    const ids = new Set(international.filter((artist) => record.artistNames.some((name) => matches(artist, name))).map((artist) => artist.pilotId));
    return sum + ids.size;
  }, 0);
}

const artists = readJson<{ artists: SeedArtist[] }>("data/seed/artists.json").artists;
const records = readJson<{ records: ExhibitionRecord[] }>("data/claims/exhibitions.json").records;
const identity = readJson<{ artists: IdentityRow[] }>("data/identity/wikidata.json").artists;
const people = buildPeople(artists, records, identity);
mkdirSync(pilotPath("view-v2"), { recursive: true });
writeFileSync(pilotPath("view-v2/index.html"), html(people), "utf8");
console.log(
  JSON.stringify({
    people: people.length,
    richest: [...people].sort((a, b) => b.count - a.count).slice(0, 5).map((person) => [person.id, person.count]),
    empty: people.filter((person) => person.count === 0).map((person) => person.id),
    distinctIncidences: distinctIncidences(artists, records),
    unique: records.filter(isRecordedExhibition).length,
  }),
);
