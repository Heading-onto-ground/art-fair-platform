import fs from "fs";
import path from "path";

type SourceRow = {
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  sourcePortal?: string;
  sourceUrl?: string;
  externalEmail?: string;
};

type WikidataRow = {
  name: string;
  city: string;
  website?: string;
  sourceUrl?: string;
};

const SOURCES_PATH = path.join(process.cwd(), "data", "portal-gallery-sources.json");
const KR_RE = new RegExp("\\uD55C\\uAD6D");

function normalizeText(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\u3131-\uD79D\u3040-\u30ff\u4e00-\u9faf\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(input: string) {
  const n = normalizeText(input)
    .replace(/\b(gallery|art museum|museum|art center|center|space)\b/g, " ")
    .replace(/(갤러리|미술관|아트센터|아트센터|아트센터|공간)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return n || normalizeText(input);
}

function normalizeCity(input: string) {
  const v = String(input || "").trim();
  const map: Record<string, string> = {
    "서울특별시": "seoul",
    "서울": "seoul",
    "부산광역시": "busan",
    "부산": "busan",
    "대구광역시": "daegu",
    "대구": "daegu",
    "인천광역시": "incheon",
    "인천": "incheon",
    "광주광역시": "gwangju",
    "광주": "gwangju",
    "대전광역시": "daejeon",
    "대전": "daejeon",
    "울산광역시": "ulsan",
    "울산": "ulsan",
    "제주시": "jeju",
    "제주": "jeju",
    "seoul": "seoul",
    "busan": "busan",
    "daegu": "daegu",
    "incheon": "incheon",
    "gwangju": "gwangju",
    "daejeon": "daejeon",
    "ulsan": "ulsan",
    "jeju": "jeju",
  };
  return map[v.toLowerCase()] || normalizeText(v);
}

function hostFromUrl(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "";
  }
}

function isValidEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input || "").trim());
}

function isPlaceholderEmail(input: string) {
  const email = String(input || "").trim().toLowerCase();
  return (
    email.endsWith("@gallery.art") ||
    email.endsWith("@rob.art") ||
    email.endsWith("@rob-roleofbridge.com") ||
    email.endsWith("@invalid.local")
  );
}

function isUsableEmail(input: string) {
  const email = String(input || "").trim().toLowerCase();
  if (!isValidEmail(email)) return false;
  if (isPlaceholderEmail(email)) return false;
  if (email.startsWith("noreply@") || email.startsWith("no-reply@")) return false;
  return true;
}

function extractEmails(text: string) {
  const matches = String(text || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return Array.from(new Set(matches.map((v) => v.toLowerCase().trim()))).filter(isUsableEmail);
}

function pickBestEmail(candidates: string[], host: string) {
  if (!candidates.length) return "";
  const sameHost = candidates.find((c) => c.endsWith(`@${host}`));
  if (sameHost) return sameHost;
  const infoLike = candidates.find((c) => c.startsWith("info@") || c.startsWith("contact@") || c.startsWith("hello@"));
  if (infoLike) return infoLike;
  return candidates[0];
}

async function fetchText(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "ROB-KR-Enricher/1.0" },
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

async function discoverEmailByWebsite(website: string, hostCache: Map<string, string>) {
  const host = hostFromUrl(website);
  if (!host) return "";
  if (hostCache.has(host)) return String(hostCache.get(host) || "");

  const origin = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  const base = origin.replace(/\/+$/, "");
  const targets = [
    base,
    `${base}/contact`,
    `${base}/about`,
    `${base}/ko/contact`,
    `${base}/en/contact`,
  ];

  const emails: string[] = [];
  for (const url of targets) {
    const html = await fetchText(url);
    if (!html) continue;
    emails.push(...extractEmails(html));
    const picked = pickBestEmail(Array.from(new Set(emails)), host);
    if (picked) {
      hostCache.set(host, picked);
      return picked;
    }
  }

  hostCache.set(host, "");
  return "";
}

async function discoverWebsiteByQuery(name: string, city: string) {
    const hasNameSignal = (candidateUrl: string) => {
      const target = normalizeName(name)
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length >= 3);
      if (!target.length) return true;
      const hay = `${hostFromUrl(candidateUrl)} ${candidateUrl.toLowerCase()}`;
      return target.some((t) => hay.includes(t));
    };
  const query = encodeURIComponent(`${name} ${city} gallery`);
  const url = `https://duckduckgo.com/html/?q=${query}`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "ROB-KR-Enricher/1.0" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return "";
    const html = await res.text();
    const linkRegex = /uddg=([^"&]+)|href="(https?:\/\/[^"]+)"/gi;
    const blockedHosts = [
      "search.naver.com",
      "map.naver.com",
      "blog.naver.com",
      "instagram.com",
      "facebook.com",
      "youtube.com",
      "x.com",
      "twitter.com",
      "tripadvisor.",
      "wikipedia.org",
      "namu.wiki",
    ];
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(html))) {
      const raw = decodeURIComponent(m[1] || m[2] || "").trim();
      if (!raw.startsWith("http")) continue;
      const host = hostFromUrl(raw);
      if (!host) continue;
      if (blockedHosts.some((b) => host.includes(b))) continue;
      if (!hasNameSignal(raw)) continue;
      return raw.split("#")[0];
    }
    return "";
  } catch {
    return "";
  }
}

function buildWikidataQuery(limit: number) {
  return `
SELECT DISTINCT ?item ?itemLabel ?cityLabel ?hqLabel ?website WHERE {
  ?item wdt:P17 wd:Q884.
  OPTIONAL { ?item wdt:P856 ?website. }
  OPTIONAL { ?item wdt:P131 ?city. }
  OPTIONAL { ?item wdt:P159 ?hq. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }
}
LIMIT ${Math.max(1, Math.min(5000, limit))}
`;
}

async function loadWikidataRows(limit: number): Promise<WikidataRow[]> {
  const url = "https://query.wikidata.org/sparql";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/sparql-query",
      accept: "application/sparql-results+json",
      "user-agent": "art-fair-platform/1.0 (kr-enricher)",
    },
    body: buildWikidataQuery(limit),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as any;
  const bindings = Array.isArray(json?.results?.bindings) ? json.results.bindings : [];
  return bindings
    .map((b: any) => ({
      name: String(b?.itemLabel?.value || "").trim(),
      city: String(b?.cityLabel?.value || b?.hqLabel?.value || "").trim(),
      website: String(b?.website?.value || "").trim() || undefined,
      sourceUrl: String(b?.item?.value || "").trim() || undefined,
    }))
    .filter((x: WikidataRow) => x.name);
}

function loadRows(): SourceRow[] {
  try {
    const raw = fs.readFileSync(SOURCES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SourceRow[]) : [];
  } catch {
    return [];
  }
}

async function main() {
  const rows = loadRows();
  const wikidata = await loadWikidataRows(5000);

  const wdByNameCity = new Map<string, WikidataRow>();
  for (const row of wikidata) {
    const key = `${normalizeName(row.name)}|${normalizeCity(row.city)}`;
    if (!wdByNameCity.has(key)) wdByNameCity.set(key, row);
  }

  const hostEmailCache = new Map<string, string>();
  let websiteFilled = 0;
  let websiteFilledBySearch = 0;
  let emailFilled = 0;
  let wikidataMatched = 0;

  for (const row of rows) {
    if (!KR_RE.test(String(row.country || ""))) continue;

    const nameKey = normalizeName(row.name);
    const cityKey = normalizeCity(row.city);
    const wd = wdByNameCity.get(`${nameKey}|${cityKey}`);

    if (!String(row.website || "").trim() && wd?.website) {
      row.website = wd.website;
      websiteFilled += 1;
      wikidataMatched += 1;
      if (!row.sourceUrl && wd.sourceUrl) row.sourceUrl = wd.sourceUrl;
      row.sourcePortal = row.sourcePortal ? `${row.sourcePortal},Wikidata` : "Wikidata";
    }

    if (!String(row.website || "").trim()) {
      const guessed = await discoverWebsiteByQuery(row.name, row.city);
      if (guessed) {
        row.website = guessed;
        websiteFilled += 1;
        websiteFilledBySearch += 1;
      }
    }

    if (!String(row.externalEmail || "").trim() && String(row.website || "").trim()) {
      const discovered = await discoverEmailByWebsite(String(row.website), hostEmailCache);
      if (discovered) {
        row.externalEmail = discovered;
        emailFilled += 1;
      }
    }
  }

  fs.writeFileSync(SOURCES_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

  const krRows = rows.filter((r) => KR_RE.test(String(r.country || "")));
  const missingWebsite = krRows.filter((r) => !String(r.website || "").trim()).length;
  const missingEmail = krRows.filter((r) => !String(r.externalEmail || "").trim()).length;

  console.log(
    JSON.stringify(
      {
        krTotal: krRows.length,
        wikidataRows: wikidata.length,
        wikidataMatched,
        websiteFilled,
        websiteFilledBySearch,
        emailFilled,
        missingWebsite,
        missingEmail,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
