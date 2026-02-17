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
};

const COUNTRY_CONFIGS: CountryConfig[] = [
  { code: "us", wikidataCountryQid: "Q30", countryKo: "미국" },
  { code: "kr", wikidataCountryQid: "Q884", countryKo: "한국" },
  { code: "jp", wikidataCountryQid: "Q17", countryKo: "일본" },
  { code: "uk", wikidataCountryQid: "Q145", countryKo: "영국" },
  { code: "fr", wikidataCountryQid: "Q142", countryKo: "프랑스" },
  { code: "de", wikidataCountryQid: "Q183", countryKo: "독일" },
  { code: "it", wikidataCountryQid: "Q38", countryKo: "이탈리아" },
  { code: "ch", wikidataCountryQid: "Q39", countryKo: "스위스" },
  { code: "cn", wikidataCountryQid: "Q148", countryKo: "중국" },
  { code: "au", wikidataCountryQid: "Q408", countryKo: "호주" },
  { code: "ca", wikidataCountryQid: "Q16", countryKo: "캐나다" },
  { code: "mx", wikidataCountryQid: "Q96", countryKo: "멕시코" },
  { code: "es", wikidataCountryQid: "Q29", countryKo: "스페인" },
  { code: "nl", wikidataCountryQid: "Q55", countryKo: "네덜란드" },
  { code: "be", wikidataCountryQid: "Q31", countryKo: "벨기에" },
  { code: "at", wikidataCountryQid: "Q40", countryKo: "오스트리아" },
  { code: "se", wikidataCountryQid: "Q34", countryKo: "스웨덴" },
  { code: "no", wikidataCountryQid: "Q20", countryKo: "노르웨이" },
  { code: "dk", wikidataCountryQid: "Q35", countryKo: "덴마크" },
  { code: "fi", wikidataCountryQid: "Q33", countryKo: "핀란드" },
  { code: "br", wikidataCountryQid: "Q155", countryKo: "브라질" },
  { code: "ar", wikidataCountryQid: "Q414", countryKo: "아르헨티나" },
  { code: "cl", wikidataCountryQid: "Q298", countryKo: "칠레" },
  { code: "co", wikidataCountryQid: "Q739", countryKo: "콜롬비아" },
  { code: "pe", wikidataCountryQid: "Q419", countryKo: "페루" },
  { code: "za", wikidataCountryQid: "Q258", countryKo: "남아프리카공화국" },
  { code: "ng", wikidataCountryQid: "Q1033", countryKo: "나이지리아" },
  { code: "ke", wikidataCountryQid: "Q114", countryKo: "케냐" },
  { code: "ma", wikidataCountryQid: "Q1028", countryKo: "모로코" },
  { code: "eg", wikidataCountryQid: "Q79", countryKo: "이집트" },
  { code: "gh", wikidataCountryQid: "Q117", countryKo: "가나" },
  { code: "sn", wikidataCountryQid: "Q1041", countryKo: "세네갈" },
  { code: "ae", wikidataCountryQid: "Q878", countryKo: "아랍에미리트" },
  { code: "sa", wikidataCountryQid: "Q851", countryKo: "사우디아라비아" },
  { code: "qa", wikidataCountryQid: "Q846", countryKo: "카타르" },
  { code: "il", wikidataCountryQid: "Q801", countryKo: "이스라엘" },
  { code: "tr", wikidataCountryQid: "Q43", countryKo: "터키" },
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

function buildSparqlQuery(countryQid: string, limit: number) {
  return `
SELECT DISTINCT ?item ?itemLabel ?cityLabel ?hqLabel ?website WHERE {
  ?item wdt:P31/wdt:P279* wd:Q1007870;
        wdt:P17 wd:${countryQid};
        wdt:P856 ?website.
  OPTIONAL { ?item wdt:P131 ?city. }
  OPTIONAL { ?item wdt:P159 ?hq. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
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

function bindingsToRows(bindings: any[], countryKo: string): RawDirectoryGallery[] {
  const rows: RawDirectoryGallery[] = [];
  for (const b of bindings) {
    const name = String(b?.itemLabel?.value || "").trim();
    const website = String(b?.website?.value || "").trim();
    const sourceUrl = String(b?.item?.value || "").trim();
    const cityRaw = String(b?.cityLabel?.value || b?.hqLabel?.value || "").trim();
    const city = sanitizeCity(cityRaw);
    if (!name || !website || !city) continue;
    rows.push({
      name,
      country: countryKo,
      city,
      website,
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

  const existing = await loadExistingSources();
  const incomingAll: RawDirectoryGallery[] = [];

  console.log(`target countries: ${targets.map((t) => t.code).join(", ")}`);
  console.log(`existing total: ${existing.length}`);
  for (const t of targets) {
    const existingCountryCount = existing.filter((x) => x.country === t.countryKo).length;
    const bindings = await fetchWikidataRows(t.wikidataCountryQid, limit);
    const imported = bindingsToRows(bindings, t.countryKo);
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

