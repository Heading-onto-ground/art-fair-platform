import { existsSync } from "fs";
import { mkdirSync, writeFileSync } from "fs";
import { readJson } from "../src/io";
import { pilotPath } from "../src/paths";
import { buildSeedArtists, type SeedArtist } from "../src/seed";
import { buildTimelineData, renderTimelineHtml } from "../src/view";
import type { ExhibitionRecord } from "../src/claims";

const artists = existsSync(pilotPath("data/seed/artists.json"))
  ? readJson<{ artists: SeedArtist[] }>("data/seed/artists.json").artists
  : buildSeedArtists();
const records = existsSync(pilotPath("data/claims/exhibitions.json"))
  ? readJson<{ records: ExhibitionRecord[] }>("data/claims/exhibitions.json").records
  : [];
const html = renderTimelineHtml(buildTimelineData(artists, records));
mkdirSync(pilotPath("view"), { recursive: true });
writeFileSync(pilotPath("view/index.html"), html, "utf8");
console.log(pilotPath("view/index.html"));
