import { mkdirSync, writeFileSync } from "fs";
import { buildCatalog } from "../src/catalog";
import type { ExhibitionRecord } from "../src/claims";
import { readJson } from "../src/io";
import { pilotPath } from "../src/paths";
import type { SeedArtist } from "../src/seed";

type IdentityRow = {
  pilotId: string;
  status: string;
  birthYear: number | null;
  aliases?: string[];
  qid?: string | null;
};

const artists = readJson<{ artists: SeedArtist[] }>("data/seed/artists.json").artists;
const records = readJson<{ records: ExhibitionRecord[] }>("data/claims/exhibitions.json").records;
const identity = readJson<{ artists: IdentityRow[] }>("data/identity/wikidata.json").artists;
const catalog = buildCatalog(artists, records, identity);
const json = JSON.stringify(catalog).replace(/</g, "\\u003c");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ROB</title>
  <meta name="description" content="Search an artist. See their journey." />
  <link rel="stylesheet" href="styles.css?v=13" />
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="top">
    <div class="frame bar">
      <a class="mark" href="#/">ROB</a>
      <nav class="links" aria-label="Primary">
        <a href="#/" data-nav="home">Search</a>
        <a href="#/explore" data-nav="explore">Explore</a>
        <a href="#/rankings" data-nav="rankings">Rankings</a>
        <a href="#/now" data-nav="now">Now</a>
        <a href="#/start" data-nav="start">Start your history</a>
      </nav>
      <div class="tools">
        <button type="button" id="nav-search" aria-label="Search" aria-expanded="false">
          <span class="search-icon" aria-hidden="true"></span>
        </button>
        <a href="#/about" data-nav="about">About</a>
      </div>
    </div>
    <form id="nav-query" class="frame nav-query" hidden role="search">
      <label class="sr" for="nav-q">Search an artist</label>
      <input id="nav-q" type="search" placeholder="Search an artist..." autocomplete="off" />
      <div id="nav-results" class="nav-results"></div>
    </form>
  </header>
  <main id="main" class="frame" tabindex="-1"></main>
  <footer class="frame colophon">
    <p>Pilot prototype. The live ROB site is unchanged.</p>
    <p>
      <button type="button" data-action="debug">Debug</button>
      <button type="button" data-action="reset">Reset demo data</button>
      <button type="button" data-action="export">Export local data</button>
    </p>
  </footer>
  <nav class="tabbar" aria-label="Mobile">
    <a href="#/" data-nav="home">Search</a>
    <a href="#/explore" data-nav="explore">Explore</a>
    <a href="#/rankings" data-nav="rankings">Rankings</a>
    <button type="button" data-action="me">Me</button>
  </nav>
  <div id="scrim" hidden></div>
  <div id="moment" hidden role="dialog" aria-modal="true" aria-labelledby="moment-title"></div>
  <div id="journey" hidden>
    <p id="journey-from"></p>
    <p id="journey-via"></p>
    <span id="journey-line" aria-hidden="true"></span>
    <p id="journey-to"></p>
  </div>
  <script>window.ROB_CATALOG = ${json};</script>
  <script src="app.js?v=14"></script>
</body>
</html>
`;

mkdirSync(pilotPath("view-v3"), { recursive: true });
writeFileSync(pilotPath("view-v3/index.html"), html, "utf8");
const lee = catalog.artists.find((artist) => artist.id === "A01");
const park = catalog.artists.find((artist) => artist.id === "A07");
const shared = catalog.exhibitions.filter((exhibition) => exhibition.artistIds.includes("A01") && exhibition.artistIds.includes("A07"));
console.log(
  JSON.stringify({
    artists: catalog.artists.length,
    exhibitions: catalog.exhibitions.length,
    spaces: catalog.spaces.length,
    curators: catalog.curators.length,
    current: catalog.now.currentIds.length,
    recent: catalog.now.recentIds.length,
    decades: catalog.explore.decades,
    lee: lee?.count,
    leeMarks: lee?.marks.length,
    park: park?.count,
    shared: shared.length,
    empty: catalog.artists.filter((artist) => artist.count === 0).map((artist) => artist.name),
    richest: [...catalog.artists].sort((a, b) => b.count - a.count).slice(0, 5).map((artist) => [artist.name, artist.count]),
  }),
);
