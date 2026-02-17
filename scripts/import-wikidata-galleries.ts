/**
 * Import gallery directory rows from Wikidata (SPARQL) and merge into
 * data/portal-gallery-sources.json.
 *
 * Usage examples:
 *   npx tsx scripts/import-wikidata-galleries.ts --country us --limit 800
 *   npx tsx scripts/import-wikidata-galleries.ts --countries us,jp,kr,uk,fr,de,it,ch,cn,au --limit 800
 *   npx tsx scripts/import-wikidata-galleries.ts --all-countries 1 --limit 1200 --dry-run
 */
import fs from "fs/promises";
import path from "path";

type RawDirectoryGallery = {
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  sourcePortal?: string;
  sourceUrl?: string;
  externalEmail?: string;
};

type CountryConfig = {
  code: string;
  wikidataCountryQid: string;
  countryKo: string;
  galleryLabelRegex?: string;
};

const COUNTRY_CONFIGS: CountryConfig[] = [
  { code: "us", wikidataCountryQid: "Q30", countryKo: "미국", galleryLabelRegex: "gallery|galerie|art\\s+space|kunsthalle" },
  { code: "kr", wikidataCountryQid: "Q884", countryKo: "한국", galleryLabelRegex: "gallery|galerie|갤러리|화랑" },
  { code: "jp", wikidataCountryQid: "Q17", countryKo: "일본", galleryLabelRegex: "gallery|ギャラリー|画廊" },
  { code: "uk", wikidataCountryQid: "Q145", countryKo: "영국", galleryLabelRegex: "gallery|galerie|art\\s+space|kunsthalle" },
  { code: "fr", wikidataCountryQid: "Q142", countryKo: "프랑스", galleryLabelRegex: "gallery|galerie|espace\\s+d.?art" },
  { code: "de", wikidataCountryQid: "Q183", countryKo: "독일", galleryLabelRegex: "gallery|galerie|kunsthalle|kunstraum" },
  { code: "it", wikidataCountryQid: "Q38", countryKo: "이탈리아", galleryLabelRegex: "gallery|galleria|spazio\\s+d.?arte" },
  { code: "ch", wikidataCountryQid: "Q39", countryKo: "스위스", galleryLabelRegex: "gallery|galerie|kunsthalle|kunstraum" },
  { code: "cn", wikidataCountryQid: "Q148", countryKo: "중국", galleryLabelRegex: "gallery|画廊|藝術空間|艺术空间|art\\s+space" },
  { code: "au", wikidataCountryQid: "Q408", countryKo: "호주", galleryLabelRegex: "gallery|art\\s+space|contemporary" },
  { code: "ca", wikidataCountryQid: "Q16", countryKo: "캐나다", galleryLabelRegex: "gallery|galerie|art\\s+space|kunsthalle" },
  { code: "mx", wikidataCountryQid: "Q96", countryKo: "멕시코", galleryLabelRegex: "gallery|galeria|galería|espacio\\s+de\\s+arte" },
  { code: "es", wikidataCountryQid: "Q29", countryKo: "스페인", galleryLabelRegex: "gallery|galeria|galería|espacio\\s+de\\s+arte" },
  { code: "nl", wikidataCountryQid: "Q55", countryKo: "네덜란드", galleryLabelRegex: "gallery|galerie|kunsthal|kunstruimte" },
  { code: "be", wikidataCountryQid: "Q31", countryKo: "벨기에", galleryLabelRegex: "gallery|galerie|kunsthal|espace\\s+d.?art" },
  { code: "at", wikidataCountryQid: "Q40", countryKo: "오스트리아", galleryLabelRegex: "gallery|galerie|kunstraum|kunsthalle" },
  { code: "se", wikidataCountryQid: "Q34", countryKo: "스웨덴", galleryLabelRegex: "gallery|galleri|konsthall" },
  { code: "no", wikidataCountryQid: "Q20", countryKo: "노르웨이", galleryLabelRegex: "gallery|galleri|kunsthall" },
  { code: "dk", wikidataCountryQid: "Q35", countryKo: "덴마크", galleryLabelRegex: "gallery|galleri|kunsthal" },
  { code: "fi", wikidataCountryQid: "Q33", countryKo: "핀란드", galleryLabelRegex: "gallery|galleria|taidehalli" },
  { code: "br", wikidataCountryQid: "Q155", countryKo: "브라질", galleryLabelRegex: "gallery|galeria|espaço\\s+de\\s+arte" },
  { code: "ar", wikidataCountryQid: "Q414", countryKo: "아르헨티나", galleryLabelRegex: "gallery|galeria|galería|espacio\\s+de\\s+arte" },
  { code: "cl", wikidataCountryQid: "Q298", countryKo: "칠레", galleryLabelRegex: "gallery|galeria|galería|espacio\\s+de\\s+arte" },
  { code: "co", wikidataCountryQid: "Q739", countryKo: "콜롬비아", galleryLabelRegex: "gallery|galeria|galería|espacio\\s+de\\s+arte" },
  { code: "pe", wikidataCountryQid: "Q419", countryKo: "페루", galleryLabelRegex: "gallery|galeria|galería|espacio\\s+de\\s+arte" },
  { code: "za", wikidataCountryQid: "Q258", countryKo: "남아프리카공화국", galleryLabelRegex: "gallery|art\\s+space|contemporary" },
  { code: "ng", wikidataCountryQid: "Q1033", countryKo: "나이지리아", galleryLabelRegex: "gallery|art\\s+space|contemporary" },
  { code: "ke", wikidataCountryQid: "Q114", countryKo: "케냐", galleryLabelRegex: "gallery|art\\s+space|contemporary" },
  { code: "ma", wikidataCountryQid: "Q1028", countryKo: "모로코", galleryLabelRegex: "gallery|galerie|espace\\s+d.?art" },
  { code: "eg", wikidataCountryQid: "Q79", countryKo: "이집트", galleryLabelRegex: "gallery|galerie|art\\s+space" },
  { code: "gh", wikidataCountryQid: "Q117", countryKo: "가나", galleryLabelRegex: "gallery|art\\s+space|contemporary" },
  { code: "sn", wikidataCountryQid: "Q1041", countryKo: "세네갈", galleryLabelRegex: "gallery|galerie|art\\s+space" },
  { code: "ae", wikidataCountryQid: "Q878", countryKo: "아랍에미리트", galleryLabelRegex: "gallery|art\\s+space|contemporary" },
  { code: "sa", wikidataCountryQid: "Q851", countryKo: "사우디아라비아", galleryLabelRegex: "gallery|art\\s+space|contemporary" },
  { code: "qa", wikidataCountryQid: "Q846", countryKo: "카타르", galleryLabelRegex: "gallery|art\\s+space|contemporary" },
  { code: "il", wikidataCountryQid: "Q801", countryKo: "이스라엘", galleryLabelRegex: "gallery|galeria|גלריה|art\\s+space" },
  { code: "tr", wikidataCountryQid: "Q43", countryKo: "터키", galleryLabelRegex: "gallery|galeri|sanat\\s+mekan" },
];

const SOURCES_PATH = path.join(process.cwd(), "data", "portal-gallery-sources.json");

function getArg(name: string, defaultValue = "") {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return "1";
  return next;
}

function normalizeText(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u3131-\uD79D\u3040-\u30ff\u4e00-\u9faf\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "";
  }
}

function dedupeKey(row: RawDirectoryGallery) {
  const host = hostFromUrl(row.website);
  if (host) return `host:${host}`;
  return `ncc:${normalizeText(row.name)}|${normalizeText(row.country)}|${normalizeText(row.city)}`;
}

function sanitizeCity(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const first = raw.split(",")[0]?.trim() || "";
  const cleaned = first
    .replace(/\s+\(.*\)$/, "")
    .replace(/\s+metropolitan area$/i, "")
    .trim();
  return cleaned || raw;
}

function isShanghai(input: string) {
  const v = String(input || "").trim().toLowerCase();
  return v === "shanghai" || v.startsWith("shanghai ");
}

function isChinaMajorCity(input: string) {
  const v = String(input || "").trim().toLowerCase();
  const majors = [
    "shanghai",
    "beijing",
    "guangzhou",
    "shenzhen",
    "chengdu",
    "hangzhou",
    "nanjing",
    "wuhan",
    "chongqing",
    "tianjin",
    "xi'an",
    "xian",
    "suzhou",
    "qingdao",
    "xiamen",
  ];
  return majors.some((m) => v === m || v.startsWith(`${m} `));
}

function buildSparqlQuery(countryQid: string, limit: number) {
  return `
SELECT DISTINCT ?item ?itemLabel ?cityLabel ?hqLabel ?website WHERE {
  ?item wdt:P31/wdt:P279* wd:Q1007870;
        wdt:P17 wd:${countryQid}.
  OPTIONAL { ?item wdt:P856 ?website. }
  OPTIONAL { ?item wdt:P131 ?city. }
  OPTIONAL { ?item wdt:P159 ?hq. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${Math.max(1, Math.min(5000, limit))}
`;
}

function buildSparqlLabelQuery(countryQid: string, labelRegex: string, limit: number) {
  const escaped = String(labelRegex || "").trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?item ?itemLabel ?cityLabel ?hqLabel ?website WHERE {
  ?item wdt:P17 wd:${countryQid}.
  ?item rdfs:label ?itemLabel.
  FILTER(LANG(?itemLabel) IN ("en","ko","ja","zh","zh-hant","zh-hans"))
  OPTIONAL { ?item wdt:P856 ?website. }
  OPTIONAL { ?item wdt:P131 ?city. }
  OPTIONAL { ?item wdt:P159 ?hq. }
  FILTER(
    REGEX(LCASE(STR(?itemLabel)), "${escaped}")
  )
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ko,ja,zh". }
}
LIMIT ${Math.max(1, Math.min(5000, limit))}
`;
}

async function fetchWikidataRows(countryQid: string, limit: number) {
  const query = buildSparqlQuery(countryQid, limit);
  const url = "https://query.wikidata.org/sparql";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/sparql-query",
      accept: "application/sparql-results+json",
      "user-agent": "art-fair-platform/1.0 (gallery-directory-import)",
    },
    body: query,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Wikidata query failed: ${res.status} ${res.statusText} ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as any;
  const bindings = json?.results?.bindings;
  if (!Array.isArray(bindings)) return [];
  return bindings as any[];
}

async function fetchWikidataRowsByLabel(countryQid: string, labelRegex: string, limit: number) {
  const query = buildSparqlLabelQuery(countryQid, labelRegex, limit);
  const url = "https://query.wikidata.org/sparql";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/sparql-query",
      accept: "application/sparql-results+json",
      "user-agent": "art-fair-platform/1.0 (gallery-directory-import)",
    },
    body: query,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Wikidata label query failed: ${res.status} ${res.statusText} ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as any;
  const bindings = json?.results?.bindings;
  if (!Array.isArray(bindings)) return [];
  return bindings as any[];
}

function bindingsToRows(bindings: any[], countryKo: string): RawDirectoryGallery[] {
  const rows: RawDirectoryGallery[] = [];
  for (const b of bindings) {
    const name = String(b?.itemLabel?.value || "").trim();
    const website = String(b?.website?.value || "").trim();
    const sourceUrl = String(b?.item?.value || "").trim();
    const cityRaw = String(b?.cityLabel?.value || b?.hqLabel?.value || "").trim();
    const city = sanitizeCity(cityRaw);
    if (!name || !city) continue;
    rows.push({
      name,
      country: countryKo,
      city,
      website: website || undefined,
      sourcePortal: "Wikidata",
      sourceUrl,
    });
  }
  return rows;
}

async function loadExistingSources() {
  try {
    const raw = await fs.readFile(SOURCES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as RawDirectoryGallery[];
    return parsed
      .map((x) => ({
        name: String(x?.name || "").trim(),
        country: String(x?.country || "").trim(),
        city: String(x?.city || "").trim(),
        website: String(x?.website || "").trim() || undefined,
        bio: String(x?.bio || "").trim() || undefined,
        sourcePortal: String(x?.sourcePortal || "").trim() || undefined,
        sourceUrl: String(x?.sourceUrl || "").trim() || undefined,
        externalEmail: String(x?.externalEmail || "").trim() || undefined,
      }))
      .filter((x) => x.name && x.country && x.city);
  } catch {
    return [] as RawDirectoryGallery[];
  }
}

function mergeRows(existing: RawDirectoryGallery[], incoming: RawDirectoryGallery[]) {
  const map = new Map<string, RawDirectoryGallery>();

  for (const row of existing) {
    map.set(dedupeKey(row), row);
  }
  for (const row of incoming) {
    const key = dedupeKey(row);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      continue;
    }
    map.set(key, {
      ...prev,
      website: prev.website || row.website,
      bio: prev.bio || row.bio,
      sourcePortal: prev.sourcePortal || row.sourcePortal,
      sourceUrl: prev.sourceUrl || row.sourceUrl,
      externalEmail: prev.externalEmail || row.externalEmail,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    if (a.city !== b.city) return a.city.localeCompare(b.city);
    return a.name.localeCompare(b.name);
  });
}

async function main() {
  const countryCode = getArg("country", "us").toLowerCase();
  const countriesArg = getArg("countries", "");
  const allCountries = getArg("all-countries", "") === "1";
  const chinaShanghaiOnly = getArg("china-shanghai-only", "") === "1";
  const chinaMajorCities = getArg("china-major-cities", "") === "1";
  const includeLabelSearch = getArg("include-label-search", "1") !== "0";
  const limit = Number(getArg("limit", "800")) || 800;
  const dryRun = getArg("dry-run", "") === "1";

  const targets = allCountries
    ? COUNTRY_CONFIGS
    : countriesArg
      ? countriesArg
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
          .map((code) => {
            const cfg = COUNTRY_CONFIGS.find((c) => c.code === code);
            if (!cfg) throw new Error(`Unsupported country code in --countries: ${code}`);
            return cfg;
          })
      : (() => {
          const cfg = COUNTRY_CONFIGS.find((c) => c.code === countryCode);
          if (!cfg) throw new Error(`Unsupported country code: ${countryCode}`);
          return [cfg];
        })();

  if (targets.length === 0) {
    throw new Error("No target countries selected.");
  }

  const existingRaw = await loadExistingSources();
  const existing = chinaShanghaiOnly
    ? existingRaw.filter((x) => !(x.country === "중국" && !isShanghai(x.city)))
    : existingRaw;
  const incomingAll: RawDirectoryGallery[] = [];

  console.log(`target countries: ${targets.map((t) => t.code).join(", ")}`);
  console.log(`existing total: ${existing.length}`);
  for (const t of targets) {
    const existingCountryCount = existing.filter((x) => x.country === t.countryKo).length;
    const bindings = await fetchWikidataRows(t.wikidataCountryQid, limit);
    const importedRaw = bindingsToRows(bindings, t.countryKo);
    let imported = importedRaw;

    if (includeLabelSearch && t.galleryLabelRegex) {
      const labelBindings = await fetchWikidataRowsByLabel(
        t.wikidataCountryQid,
        t.galleryLabelRegex,
        limit
      );
      const labelRows = bindingsToRows(labelBindings, t.countryKo);
      imported = mergeRows(imported, labelRows);
      console.log(
        `[${t.code}] labelSearch raw=${labelBindings.length} valid=${labelRows.length} mergedWithPrimary=${imported.length}`
      );
    }

    if (t.code === "cn") {
      if (chinaShanghaiOnly) {
        imported = imported.filter((x) => isShanghai(x.city));
      } else if (chinaMajorCities) {
        imported = imported.filter((x) => isChinaMajorCity(x.city));
      }
    }
    incomingAll.push(...imported);
    console.log(`[${t.code}] existing=${existingCountryCount} raw=${bindings.length} valid=${imported.length}`);
  }

  const merged = mergeRows(existing, incomingAll);
  console.log(`incoming total(valid): ${incomingAll.length}`);
  console.log(`merged total: ${merged.length}`);
  for (const t of targets) {
    const mergedCountryCount = merged.filter((x) => x.country === t.countryKo).length;
    console.log(`[${t.code}] merged=${mergedCountryCount}`);
  }
  if (chinaShanghaiOnly) {
    const chinaTotal = merged.filter((x) => x.country === "중국").length;
    const chinaShanghai = merged.filter((x) => x.country === "중국" && isShanghai(x.city)).length;
    console.log(`[cn] shanghaiOnly=true total=${chinaTotal} shanghai=${chinaShanghai}`);
  }

  if (dryRun) {
    console.log("dry-run mode: data file was not updated.");
    return;
  }

  await fs.mkdir(path.dirname(SOURCES_PATH), { recursive: true });
  await fs.writeFile(SOURCES_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(`updated: ${SOURCES_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

