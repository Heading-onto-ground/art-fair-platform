import { buildExhibition, isRecordedExhibition, type ExhibitionRecord } from "../src/claims";
import { exhibitionFromSinglePage, exhibitionsFromBlocks, exhibitionsFromCards, exhibitionsFromCv, plainPage } from "../src/cvList";
import { fetchText } from "../src/http";
import { readJson, writeJson } from "../src/io";
import { median } from "../src/metrics";
import { exhibitionKey } from "../src/product";
import { robotsAllows } from "../src/robots";
import { compactName } from "../src/resolve";
import type { SeedArtist } from "../src/seed";

type Candidate = { pilotId: string; queries: string[]; urls: string[] };

const CANDIDATES: Candidate[] = [
  {
    pilotId: "A03",
    queries: ['"Do Ho Suh" exhibition Tate Modern official'],
    urls: ["https://www.tate.org.uk/whats-on/tate-modern/the-genesis-exhibition-do-ho-suh"],
  },
  {
    pilotId: "A04",
    queries: ["Lee Bul official exhibition museum gallery retrospective", "Lee Bul Lehmann Maupin exhibitions official"],
    urls: [
      "https://www.lehmannmaupin.com/artists/lee-bul/exhibitions",
      "https://www.mplus.org.hk/en/exhibitions/lee-bul-from-1998-to-now/",
      "https://www.muhka.be/en/exhibitions/lee-bul-from-1998-to-now/",
    ],
  },
  {
    pilotId: "A05",
    queries: ["Kimsooja official exhibitions CV museum"],
    urls: ["https://kimsooja.com/home/exhibitions", "https://kimsooja.com/home/info/biography"],
  },
  {
    pilotId: "A06",
    queries: ["Anicka Yi exhibition museum official"],
    urls: [
      "https://ucca-group.com/en/exhibition/anicka-yi/",
      "https://www.mfah.org/exhibitions/anicka-yi",
      "https://collections.stormking.org/Detail/occurrences/222",
      "https://www.aros.dk/en/exhibitions/step-inside/",
    ],
  },
  {
    pilotId: "A09",
    queries: ["Lee Bae artist official exhibitions gallery CV"],
    urls: [
      "https://www.estherschipper.com/artists/155-lee-bae/biography/",
      "https://www.johyungallery.com/artists/50-lee-bae/biography/",
      "https://www.estherschipper.com/artists/155-lee-bae/",
    ],
  },
  {
    pilotId: "A10",
    queries: ['"Chung Sang-Hwa" exhibition museum gallery official'],
    urls: [
      "https://www.mmca.go.kr/eng/exhibitions/exhibitionsDetail.do?exhId=202101290001367",
      "https://www.galleryhyundai.com/artist/view/20000000007",
      "https://levygorvy.com/exhibitions/chung-sang-hwa-london-2020/",
      "https://levygorvy.com/exhibitions/chung-sang-hwa/",
    ],
  },
  {
    pilotId: "A11",
    queries: ["Kim Beom artist exhibition museum official"],
    urls: [
      "https://www.clevelandart.org/exhibitions/kim-beom-objects-being-taught-they-are-nothing-tools",
      "https://www.stpi.com.sg/whats-on/kim-beom-random-life",
      "https://kunsthalaarhus.dk/en/Exhibitions/Beom-Kim",
      "https://chapterii.org/press/184-kim-beom-how-to-become-a-rock-at-leeum-museum/",
    ],
  },
  {
    pilotId: "A12",
    queries: ["Minouk Lim exhibition museum official artist"],
    urls: [
      "https://www.walkerart.org/whats-on/minouk-lim/",
      "https://www.portikus.de/en/exhibitions/195_united_paradox",
      "https://tinakimgallery.com/exhibitions/173-minouk-lim-hyper-yellow-ilmin-museum-of-art/",
    ],
  },
  {
    pilotId: "A13",
    queries: ["Koo Jeong A Venice Biennale official exhibition"],
    urls: [
      "https://www.labiennale.org/en/art/2024/korea-republic",
      "https://www.arko.or.kr/pavilion/24pavilion/en/exhibition.html",
      "https://www.korean-pavilion.or.kr/en/artist.html",
    ],
  },
  {
    pilotId: "A15",
    queries: ["Mire Lee exhibition Tate Modern official"],
    urls: ["https://www.tate.org.uk/whats-on/tate-modern/mire-lee"],
  },
  {
    pilotId: "A17",
    queries: ['"siren eun young jung" exhibition official'],
    urls: [
      "https://www.wkv-stuttgart.de/en/program/2026/ausstellungen/resistant-theatre/",
      "https://kunstverein-duesseldorf.de/en/exhibitions/deferral-theatre/",
      "http://sirenjung.com/",
    ],
  },
  {
    pilotId: "A18",
    queries: ["Ayoung Kim exhibition museum official site"],
    urls: [
      "https://vanabbemuseum.nl/en/see-and-do/exhibitions/ayoung-kim",
      "https://www.momaps1.org/en/programs/556-ayoung-kim/",
      "https://www.smb.museum/en/exhibitions/detail/ayoung-kim/",
      "https://www.ima.org.au/exhibitions/ayoung-kim-delivery-dancers-sphere/",
    ],
  },
  {
    pilotId: "A19",
    queries: ["Geumhyung Jeong exhibition museum official"],
    urls: [
      "https://www.geumhyungjeong.com/archive.html",
      "https://www.geumhyungjeong.com/current.html",
      "https://kunsthallebasel.ch/en/exhibitions/geumhyung-jeong",
      "https://ica.art/exhibitions/geumhyung-jeong-under-construction",
    ],
  },
  {
    pilotId: "A20",
    queries: ["Yeesookyung official exhibition gallery museum"],
    urls: ["https://www.yeesookyung.com/cv"],
  },
  {
    pilotId: "A21",
    queries: ["Kyungah Ham exhibition museum official"],
    urls: [
      "https://artsonje.org/en/exhibition/kyungah-ham-desire-and-anesthesia/",
      "https://www.carliergebauer.com/exhibition/3795/",
    ],
  },
  {
    pilotId: "A22",
    queries: ["Im Heung-soon exhibition museum official"],
    urls: [
      "https://www.mmca.go.kr/eng/exhibitions/exhibitionsDetail.do?exhId=201703170000564",
      "http://imheungsoon.com/",
      "https://www.moma.org/calendar/exhibitions/3695",
      "https://thepage-gallery.com/exhibitions/14-im-heung-soon-ghost-guide/",
    ],
  },
  {
    pilotId: "A24",
    queries: ["Moon Kyungwon exhibition museum official"],
    urls: [
      "https://moonandjeon.com/Moon-Kyungwon",
      "https://www.ycam.jp/en/archive/works/promise-park-rendering-of-future-patterns/",
      "https://www.mmca.go.kr/eng/exhibitions/exhibitionsDetail.do?exhId=202101290001376",
      "https://kanazawa21.jp/data_list.php?g=81&d=208",
    ],
  },
  {
    pilotId: "A25",
    queries: ['"Nikki S. Lee" exhibition museum official'],
    urls: [
      "https://umma.umich.edu/exhibitions/in-focus-nikki-s-lee/",
      "https://mattress.org/exhibition/layers-series-rome-prague-bangkok-seoul-new-york/",
      "https://nmwa.org/art/artists/nikki-s-lee/",
      "https://vsf.la/exhibitions/49-nikki-s.-lee-parts-and-scenes",
    ],
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function namesOf(artist: SeedArtist): string[] {
  return [artist.canonicalKoreanName, ...artist.romanizedNames, ...artist.otherAliases];
}

function namedCount(records: ExhibitionRecord[], artist: SeedArtist): number {
  const names = new Set(namesOf(artist));
  return records.filter((record) => isRecordedExhibition(record) && record.artistNames.some((name) => names.has(name))).length;
}

async function robotsFor(origin: string, cache: Map<string, string | null>): Promise<string | null> {
  if (cache.has(origin)) return cache.get(origin) ?? null;
  try {
    const response = await fetchText(`${origin}/robots.txt`, 12000);
    const text = response.status === 200 ? response.text : null;
    cache.set(origin, text);
    return text;
  } catch {
    cache.set(origin, null);
    return null;
  }
}

async function main(): Promise<void> {
  const artists = readJson<{ artists: SeedArtist[] }>("data/seed/artists.json").artists.filter(
    (artist) => artist.cohort === "INTERNATIONAL",
  );
  const byId = new Map(artists.map((artist) => [artist.pilotId, artist]));
  const store = readJson<{ phase: string; records: ExhibitionRecord[] }>("data/claims/exhibitions.json");
  const before = artists.map((artist) => namedCount(store.records, artist));
  const keys = new Map<string, ExhibitionRecord>();
  for (const record of store.records) {
    if (!isRecordedExhibition(record)) continue;
    keys.set(exhibitionKey(record.title, record.venueName, record.start?.value ?? null), record);
  }
  const retrievedAt = new Date().toISOString();
  const robotsCache = new Map<string, string | null>();
  const reviewed: {
    pilotId: string;
    url: string;
    http: number | null;
    robots: string;
    hits: number;
    accepted: number;
    attached: number;
    rejected: number;
    reason: string;
  }[] = [];

  for (const candidate of CANDIDATES) {
    const artist = byId.get(candidate.pilotId);
    if (!artist) continue;
    const urls = candidate.urls.slice(0, 10);
    for (const url of urls) {
      const target = new URL(url);
      await sleep(400);
      const robots = await robotsFor(target.origin, robotsCache);
      if (robots === null) {
        reviewed.push({ pilotId: artist.pilotId, url, http: null, robots: "UNREADABLE", hits: 0, accepted: 0, attached: 0, rejected: 0, reason: "manual_queue_robots_unreadable" });
        console.log(artist.pilotId, "robots-unreadable", url);
        continue;
      }
      if (!robotsAllows(robots, `${target.pathname}${target.search}`)) {
        reviewed.push({ pilotId: artist.pilotId, url, http: null, robots: "DISALLOWED", hits: 0, accepted: 0, attached: 0, rejected: 0, reason: "automated_path_disallowed" });
        console.log(artist.pilotId, "robots-disallow", url);
        continue;
      }
      let response: { status: number; text: string };
      try {
        response = await fetchText(url, 25000);
      } catch {
        reviewed.push({ pilotId: artist.pilotId, url, http: null, robots: "ALLOWED", hits: 0, accepted: 0, attached: 0, rejected: 0, reason: "fetch_failed" });
        console.log(artist.pilotId, "fetch-failed", url);
        continue;
      }
      const page = response.status === 200 ? plainPage(response.text) : "";
      const names = namesOf(artist);
      const single = page ? exhibitionFromSinglePage(page, names) : null;
      const hits = page ? [...exhibitionsFromCv(page, names), ...exhibitionsFromBlocks(page, names), ...exhibitionsFromCards(page, names)] : [];
      if (single) hits.push(single);
      let accepted = 0;
      let attached = 0;
      let rejected = 0;
      for (const hit of hits) {
        const evidenceFor = (value: string | null) => {
          if (!value || value.length > 200) return null;
          if (hit.line.includes(value) && hit.line.length <= 200) return hit.line;
          return page.includes(value) ? value : null;
        };
        const others = artists
          .flatMap(namesOf)
          .filter((name, index, all) => all.indexOf(name) === index && hit.line.includes(name));
        const present = [
          ...new Set([
            ...names.filter((name) => page.includes(name) && (hit.section === "solo" || hit.line.includes(name))),
            ...others,
          ]),
        ];
        const record = buildExhibition({
          title: hit.title,
          titleEvidence: evidenceFor(hit.title) ?? hit.title,
          dateEvidence: page.includes(hit.year) ? hit.year : null,
          venue: hit.venue,
          venueEvidence: evidenceFor(hit.venue),
          city: hit.city,
          cityEvidence: evidenceFor(hit.city),
          country: hit.country,
          countryEvidence: evidenceFor(hit.country),
          artists: [...new Set(present)].filter((name) => evidenceFor(name)).map((name) => ({ name, evidence: evidenceFor(name) ?? name })),
          curators: [],
          exhibitionType: hit.section === "group" ? "Group" : "Solo",
          exhibitionTypeEvidence: null,
          sourceUrl: url,
          sourceTier: 1,
          sourceAllowed: false,
          pilotManualEligible: true,
          retrievedAt,
          pageText: page,
          confidence: 0.9,
        });
        if (record.status !== "PILOT_ACCEPTED") {
          rejected += 1;
          store.records.push(record);
          continue;
        }
        const key = exhibitionKey(record.title, record.venueName, record.start?.value ?? null);
        const prior = keys.get(key);
        if (prior) {
          const sources = new Set([prior.sourceUrl, ...(prior.additionalSources ?? [])]);
          if (!sources.has(url)) prior.additionalSources = [...sources, url].filter((item) => item !== prior.sourceUrl);
          attached += 1;
          continue;
        }
        keys.set(key, record);
        store.records.push(record);
        accepted += 1;
      }
      reviewed.push({
        pilotId: artist.pilotId,
        url,
        http: response.status,
        robots: "ALLOWED",
        hits: hits.length,
        accepted,
        attached,
        rejected,
        reason: response.status === 200 ? "page_opened" : `http_${response.status}`,
      });
      console.log(artist.pilotId, response.status, "hits", hits.length, "accepted", accepted, "attached", attached, url);
    }
  }

  const after = artists.map((artist) => namedCount(store.records, artist));
  const acceptedRecords = store.records.filter(isRecordedExhibition);
  const names = new Set(artists.flatMap(namesOf));
  const incidences = acceptedRecords.reduce(
    (sum, record) => sum + record.artistNames.filter((name) => names.has(name)).length,
    0,
  );
  store.phase = "P2-A";
  writeJson("data/claims/exhibitions.json", store);
  const scorecard = {
    retrievedAt,
    reviewMinutes: null,
    before,
    after,
    median: median(after),
    atLeast8: after.filter((count) => count >= 8).length,
    uniqueExhibitions: acceptedRecords.length,
    incidences,
    rescued: artists.filter((artist, index) => before[index] < 8 && after[index] >= 8).map((artist) => artist.pilotId),
    reviewed,
    queries: CANDIDATES.map((item) => ({ pilotId: item.pilotId, queries: item.queries, queryCount: item.queries.length })),
  };
  writeJson("data/manifest/search-rescue.json", scorecard);
  console.log(JSON.stringify({ median: scorecard.median, atLeast8: scorecard.atLeast8, unique: scorecard.uniqueExhibitions, incidences, rescued: scorecard.rescued, after }));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
