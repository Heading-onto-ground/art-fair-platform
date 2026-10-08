import { fetchText } from "../src/http";
import { readJson, writeJson } from "../src/io";
import { robotsAllows } from "../src/robots";
import type { SeedArtist } from "../src/seed";
import {
  acceptEntity,
  markSharedQids,
  parseEntityData,
  wikipediaItemId,
  type IdentityStatus,
} from "../src/wikidataIdentity";

type IdentityRow = {
  pilotId: string;
  cohort: SeedArtist["cohort"];
  status: IdentityStatus;
  qid: string | null;
  canonicalEnglishLabel: string | null;
  koreanLabel: string | null;
  aliases: string[];
  birthYear: number | null;
  birthDate: string | null;
  birthPrecision: number | null;
  participantInStatements: number | null;
  reason: string;
  evidenceUrl: string | null;
};

const WIKIDATA_ROBOTS = "https://www.wikidata.org/robots.txt";
const QUERY_ROBOTS = "https://query.wikidata.org/robots.txt";
const EN_ROBOTS = "https://en.wikipedia.org/robots.txt";
const KO_ROBOTS = "https://ko.wikipedia.org/robots.txt";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getText(url: string): Promise<{ status: number; text: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchText(url, 25000);
      if (response.status === 429 || response.status >= 500) {
        await sleep(8000 * (attempt + 1));
        continue;
      }
      return response;
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  return { status: 0, text: "" };
}

function wikiUrl(host: "en.wikipedia.org" | "ko.wikipedia.org", title: string): string {
  return `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function titlesFor(artist: SeedArtist): { host: "en.wikipedia.org" | "ko.wikipedia.org"; title: string }[] {
  const english = [...artist.romanizedNames, ...artist.otherAliases].filter((name) => /[A-Za-z]/.test(name));
  const unique = [...new Set(english)];
  return [
    ...unique.map((title) => ({ host: "en.wikipedia.org" as const, title })),
    { host: "ko.wikipedia.org" as const, title: artist.canonicalKoreanName },
  ];
}

async function main(): Promise<void> {
  const [wikidata, query, english, korean] = await Promise.all([
    getText(WIKIDATA_ROBOTS),
    getText(QUERY_ROBOTS),
    getText(EN_ROBOTS),
    getText(KO_ROBOTS),
  ]);
  if (wikidata.status !== 200 || query.status !== 200 || english.status !== 200 || korean.status !== 200) {
    throw new Error("robots.txt was not readable; identity lookup stopped");
  }
  const entityPath = "/wiki/Special:EntityData/Q1567689.json";
  if (!robotsAllows(wikidata.text, entityPath)) {
    throw new Error("Special:EntityData is not allowed; refusing to fetch identity");
  }
  if (robotsAllows(wikidata.text, "/w/api.php") || robotsAllows(query.text, "/sparql")) {
    throw new Error("Refusing to run because a blocked endpoint evaluated as allowed");
  }

  const artists = readJson<{ artists: SeedArtist[] }>("data/seed/artists.json").artists;
  const robots = {
    "en.wikipedia.org": english.text,
    "ko.wikipedia.org": korean.text,
  };
  const rows: IdentityRow[] = [];

  for (const artist of artists) {
    const requireBoth = Boolean(artist.ambiguityNote);
    const accepted: IdentityRow[] = [];
    const seen = new Set<string>();
    for (const candidate of titlesFor(artist)) {
      const url = wikiUrl(candidate.host, candidate.title);
      const path = new URL(url).pathname;
      if (!robotsAllows(robots[candidate.host], path)) continue;
      await sleep(400);
      const page = await getText(url);
      if (page.status !== 200) continue;
      const qid = wikipediaItemId(page.text);
      if (!qid || seen.has(qid)) continue;
      seen.add(qid);
      const dataUrl = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
      await sleep(400);
      const data = await getText(dataUrl);
      if (data.status !== 200) continue;
      let payload: unknown;
      try {
        payload = JSON.parse(data.text) as unknown;
      } catch {
        continue;
      }
      const entity = parseEntityData(payload, qid);
      if (!entity) continue;
      const decision = acceptEntity(
        {
          canonicalKoreanName: artist.canonicalKoreanName,
          romanizedNames: artist.romanizedNames,
          otherAliases: artist.otherAliases,
          requireBoth,
        },
        entity,
      );
      if (!decision.accept) continue;
      accepted.push({
        pilotId: artist.pilotId,
        cohort: artist.cohort,
        status: "QID_CONFIRMED",
        qid,
        canonicalEnglishLabel: entity.englishLabel,
        koreanLabel: entity.koreanLabel,
        aliases: entity.aliases,
        birthYear: entity.birth.year,
        birthDate: entity.birth.date,
        birthPrecision: entity.birth.precision,
        participantInStatements: entity.participantInStatements,
        reason: decision.reason,
        evidenceUrl: dataUrl,
      });
    }

    if (accepted.length === 1) {
      rows.push(accepted[0] as IdentityRow);
    } else if (accepted.length > 1) {
      rows.push({
        pilotId: artist.pilotId,
        cohort: artist.cohort,
        status: "QID_AMBIGUOUS",
        qid: null,
        canonicalEnglishLabel: null,
        koreanLabel: null,
        aliases: [],
        birthYear: null,
        birthDate: null,
        birthPrecision: null,
        participantInStatements: null,
        reason: "multiple_entitydata_matches",
        evidenceUrl: null,
      });
    } else {
      rows.push({
        pilotId: artist.pilotId,
        cohort: artist.cohort,
        status: "QID_UNRESOLVED",
        qid: null,
        canonicalEnglishLabel: null,
        koreanLabel: null,
        aliases: [],
        birthYear: null,
        birthDate: null,
        birthPrecision: null,
        participantInStatements: null,
        reason: "no_unique_artist_match",
        evidenceUrl: null,
      });
    }
    console.log(`${artist.pilotId} ${rows[rows.length - 1]?.status} ${rows[rows.length - 1]?.qid ?? ""}`);
  }

  const marked = markSharedQids(rows);
  const summary = {
    confirmed: marked.filter((item) => item.status === "QID_CONFIRMED").length,
    ambiguous: marked.filter((item) => item.status === "QID_AMBIGUOUS").length,
    unresolved: marked.filter((item) => item.status === "QID_UNRESOLVED").length,
  };
  writeJson("data/identity/wikidata.json", {
    phase: "P1-S",
    generatedAt: new Date().toISOString(),
    accessPath: "https://www.wikidata.org/wiki/Special:EntityData/{QID}.json",
    discoveryPath: "Wikipedia article wgWikibaseItemId, then EntityData",
    notUsed: ["https://www.wikidata.org/w/api.php", "https://query.wikidata.org/sparql"],
    seedFileUntouched: true,
    autoMergeRule: "identical_qid_only",
    summary,
    artists: marked,
  });
  console.log(JSON.stringify(summary));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
