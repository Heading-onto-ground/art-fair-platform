import { buildExhibition, type ExhibitionRecord } from "../src/claims";
import { exhibitionsFromBlocks, exhibitionsFromCv, plainPage } from "../src/cvList";
import { fetchText } from "../src/http";
import { readJson, writeJson } from "../src/io";
import { median } from "../src/metrics";
import { classifyManualResearch, type SourceSignals } from "../src/sourcePolicy";
import { compactName } from "../src/resolve";
import type { SeedArtist } from "../src/seed";

type MatrixRow = {
  domain: string;
  robots_access: SourceSignals["robotsAccess"];
  official_api_or_dataset: string;
  structured_data_license: SourceSignals["structuredDataLicense"];
  commercial_reuse_status: string;
  reason: string;
  final_pilot_status: string;
  pilot_manual_research_status?: string;
};

const INDEXES = [
  "https://www.kukjegallery.com/artists",
  "https://www.lehmannmaupin.com/artists",
  "https://www.pkmgallery.com/artists",
  "https://www.arariogallery.com/artists",
  "https://www.gallerybaton.com/artists",
  "https://www.galleryhyundai.com/",
  "https://www.tate.org.uk/",
  "https://www.guggenheim.org/",
  "https://whitney.org/",
  "https://www.labiennale.org/",
  "https://www.mmca.go.kr/",
  "https://koreaartistprize.org/",
  "https://www.southbankcentre.co.uk/",
  "https://www.moma.org/",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function manualStatus(row: MatrixRow): string {
  const openData = /wikidata|data\.go\.kr/.test(row.domain) || /OFFICIAL|SPECIAL_ENTITY|OPEN_API|FILE_DATASET|CATALOG/.test(row.official_api_or_dataset);
  const explicit = row.commercial_reuse_status === "INCOMPATIBLE" || row.reason === "explicit_reuse_restriction";
  return classifyManualResearch({
    robotsAccess: row.robots_access,
    officialInterface: "NONE",
    structuredDataLicense: explicit ? "INCOMPATIBLE" : row.structured_data_license,
    explicitReuseBan: explicit,
    accessBarrier: "NONE",
    officialExhibitionPage: !openData && row.domain !== "www.e-flux.com",
  });
}

function namesOf(artist: SeedArtist): string[] {
  return [artist.canonicalKoreanName, ...artist.romanizedNames, ...artist.otherAliases];
}

function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function nameOnLine(line: string, name: string): boolean {
  if (name.length >= 4) return line.includes(name);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u").test(line);
}

function anchorPairs(html: string, base: string): { href: string; text: string }[] {
  const pairs: { href: string; text: string }[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const href = new URL(match[1], base).toString();
      const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text) pairs.push({ href, text });
    } catch {
      continue;
    }
  }
  return pairs;
}

async function main(): Promise<void> {
  const matrix = readJson<{ rows: MatrixRow[] }>("data/policy/source-policy-matrix.json");
  for (const row of matrix.rows) row.pilot_manual_research_status = manualStatus(row);
  writeJson("data/policy/source-policy-matrix.json", matrix);
  const eligibleHosts = new Set(
    matrix.rows.filter((row) => row.pilot_manual_research_status === "ELIGIBLE").map((row) => row.domain),
  );

  const artists = readJson<{ artists: SeedArtist[] }>("data/seed/artists.json").artists.filter(
    (artist) => artist.cohort === "INTERNATIONAL",
  );
  const chosen = new Map<string, { href: string; text: string }[]>();
  for (const index of INDEXES) {
    const host = new URL(index).host;
    if (!eligibleHosts.has(host)) continue;
    await sleep(300);
    const response = await fetchText(index, 20000);
    console.log("index", host, response.status);
    if (response.status !== 200) continue;
    const pairs = anchorPairs(response.text, index);
    for (const artist of artists) {
      const wanted = namesOf(artist).map(compactName).filter((name) => name.length > 2);
      const slugs = namesOf(artist).map(slugOf).filter((slug) => slug.length >= 6);
      const matches = pairs.filter((pair) => {
        let url: URL;
        try {
          url = new URL(pair.href);
        } catch {
          return false;
        }
        if (!eligibleHosts.has(url.host)) return false;
        if (/\.pdf($|\?)/i.test(url.pathname)) return false;
        const path = `${url.pathname}${url.search}`.toLowerCase();
        if (/privacy|login|account|mailto|\/cart|\/shop/i.test(path)) return false;
        const text = compactName(pair.text);
        const textHit = wanted.some((name) => text.includes(name));
        const slugHit = slugs.some((slug) => path.includes(slug));
        return textHit || slugHit;
      });
      const bucket = chosen.get(artist.pilotId) ?? [];
      for (const match of matches) {
        if (bucket.length >= 8) break;
        if (!bucket.some((item) => item.href === match.href)) bucket.push(match);
      }
      chosen.set(artist.pilotId, bucket);
    }
  }

  const retrievedAt = new Date().toISOString();
  const records: ExhibitionRecord[] = [];
  const opened: { pilotId: string; url: string; status: number; hits: number }[] = [];
  const seen = new Set<string>();

  for (const artist of artists) {
    const urls = (chosen.get(artist.pilotId) ?? []).slice(0, 8);
    for (const target of urls) {
      const host = new URL(target.href).host;
      if (!eligibleHosts.has(host)) continue;
      await sleep(350);
      const response = await fetchText(target.href, 25000);
      const page = response.status === 200 ? plainPage(response.text) : "";
      const names = namesOf(artist);
      const hits =
        response.status === 200
          ? [...exhibitionsFromCv(page, names), ...exhibitionsFromBlocks(page, names)]
          : [];
      opened.push({ pilotId: artist.pilotId, url: target.href, status: response.status, hits: hits.length });
      console.log(artist.pilotId, response.status, hits.length, target.href);
      for (const hit of hits) {
        const key = `${artist.pilotId}|${hit.year}|${compactName(hit.title)}|${compactName(hit.venue)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const evidenceFor = (value: string | null) => {
          if (!value || value.length > 200) return null;
          if (hit.line.includes(value) && hit.line.length <= 200) return hit.line;
          return page.includes(value) ? value : null;
        };
        const presentNames = namesOf(artist).filter((name) => page.includes(name));
        const coNames = artists
          .flatMap(namesOf)
          .filter((name, index, all) => all.indexOf(name) === index && nameOnLine(hit.line, name));
        const artistFacts = [...new Set(hit.section === "solo" ? presentNames.slice(0, 1).concat(coNames) : coNames)]
          .filter((name) => page.includes(name))
          .map((name) => ({ name, evidence: evidenceFor(name) ?? name }));
        const typeWord = hit.section === "solo" ? "Solo" : "Group";
        records.push(
          buildExhibition({
            title: hit.title,
            titleEvidence: evidenceFor(hit.title) ?? hit.title,
            dateEvidence: page.includes(hit.year) ? hit.year : null,
            venue: hit.venue,
            venueEvidence: evidenceFor(hit.venue),
            city: hit.city,
            cityEvidence: evidenceFor(hit.city),
            country: hit.country,
            countryEvidence: evidenceFor(hit.country),
            artists: artistFacts.filter((artistFact) => artistFact.evidence),
            curators: [],
            exhibitionType: typeWord,
            exhibitionTypeEvidence:
              hit.heading && page.includes(hit.heading) && hit.heading.includes(typeWord) ? hit.heading : null,
            sourceUrl: target.href,
            sourceTier: 1,
            sourceAllowed: false,
            pilotManualEligible: true,
            retrievedAt,
            pageText: page,
            confidence: 0.9,
          }),
        );
      }
    }
  }

  const accepted = records.filter((record) => record.status === "PILOT_ACCEPTED");
  const counts = artists.map((artist) => {
    const names = new Set(namesOf(artist));
    return accepted.filter((record) => record.artistNames.some((name) => names.has(name))).length;
  });
  writeJson("data/claims/exhibitions.json", {
    phase: "P1-M",
    usageStatus: "PILOT_ONLY",
    productionClearance: "UNRESOLVED",
    records,
  });
  writeJson("data/manifest/international-manual.json", {
    opened,
    accepted: accepted.length,
    rejected: records.length - accepted.length,
    perArtist: artists.map((artist, index) => ({
      pilotId: artist.pilotId,
      name: artist.romanizedNames[0],
      urls: (chosen.get(artist.pilotId) ?? []).map((item) => item.href),
      accepted: counts[index],
    })),
    median: median(counts),
  });
  console.log(JSON.stringify({ accepted: accepted.length, median: median(counts), counts }));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
