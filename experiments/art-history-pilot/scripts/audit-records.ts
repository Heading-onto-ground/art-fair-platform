import { readJson } from "../src/io";
import type { ExhibitionRecord } from "../src/claims";
import { buildSeedArtists } from "../src/seed";

const data = readJson<{ records: ExhibitionRecord[] }>("data/claims/exhibitions.json");
const accepted = data.records.filter((record) => record.status === "PILOT_ACCEPTED");
const junk = /participate in|">|http|courtesy|vogue|subject of|works by/i;
const odd = accepted.filter((record) => junk.test(`${record.title} ${record.venueName}`) || record.title.length > 90);
const statuses = new Map<string, number>();
for (const record of data.records) statuses.set(record.status, (statuses.get(record.status) ?? 0) + 1);
console.log("statuses", Object.fromEntries(statuses));
console.log("accepted", accepted.length, "junkish", odd.length);
const hosts = new Map<string, number>();
for (const record of accepted) {
  const host = new URL(record.sourceUrl).host;
  hosts.set(host, (hosts.get(host) ?? 0) + 1);
}
console.log("hosts", Object.fromEntries(hosts));
const withCurator = accepted.filter((record) => record.curatorNames.length > 0).length;
const withCo = accepted.filter((record) => record.artistNames.length > 1).length;
const colonVenues = accepted.filter((record) => record.venueName?.includes(":"));
console.log("curator", withCurator, "multiName", withCo, "colonVenues", colonVenues.length);
const seed = buildSeedArtists().filter((artist) => artist.cohort === "INTERNATIONAL");
const byName = new Map<string, string>();
for (const artist of seed) {
  for (const name of [artist.canonicalKoreanName, ...artist.romanizedNames, ...artist.otherAliases]) byName.set(name, artist.pilotId);
}
const multiSeed = accepted.filter((record) => {
  const ids = new Set(record.artistNames.map((name) => byName.get(name)).filter(Boolean));
  return ids.size > 1;
});
console.log("recordsNamingTwoSeedArtists", multiSeed.length);
console.log("--- junk ---");
for (const record of odd.slice(0, 15)) {
  console.log(record.status, record.title.slice(0, 100), "|", record.venueName?.slice(0, 80));
}
console.log("--- kimsooja ---");
const kim = new Set(["김수자", "Kimsooja", "Kim Sooja"]);
for (const record of accepted.filter((item) => item.artistNames.some((name) => kim.has(name)))) {
  console.log(record.sourceUrl, record.artistNames.join(","), record.title.slice(0, 80), "|", record.venueName);
}
console.log("--- own vs named ---");
const artists = buildSeedArtists().filter((artist) => artist.cohort === "INTERNATIONAL");
const manifest = readJson<{ opened: { pilotId: string; url: string; status: number }[] }>(
  "data/manifest/international-manual.json",
);
for (const artist of artists) {
  const names = new Set([artist.canonicalKoreanName, ...artist.romanizedNames, ...artist.otherAliases]);
  const ownUrls = new Set(
    manifest.opened.filter((item) => item.pilotId === artist.pilotId && item.status === 200).map((item) => item.url),
  );
  const named = accepted.filter((record) => record.artistNames.some((name) => names.has(name)));
  const own = named.filter((record) => ownUrls.has(record.sourceUrl));
  if (named.length === 0 && ownUrls.size === 0) continue;
  console.log(artist.pilotId, artist.romanizedNames[0], "named", named.length, "own", own.length, "opened", ownUrls.size);
}
console.log("--- samples ---");
for (const record of accepted.filter((_, index) => index % 60 === 0).slice(0, 8)) {
  console.log(record.artistNames[0], record.start?.value, record.title, "|", record.venueName, record.city, record.country);
}
