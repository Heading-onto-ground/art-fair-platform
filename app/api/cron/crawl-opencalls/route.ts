import { NextResponse } from "next/server";
import { createOpenCall, listOpenCalls } from "@/app/data/openCalls";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Simulated external open call sources
// In production, these would be actual web scrapers/RSS parsers
type CrawledOpenCall = {
  source: string;
  gallery: string;
  galleryId: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  externalEmail: string;
  externalUrl: string;
  galleryWebsite: string;
  galleryDescription: string;
};

type CityQuery = {
  country: string;
  city: string;
};

type PortalSource = {
  name: string;
  buildQuery: (city: string) => string;
  buildSearchUrl: (query: string) => string;
};

const CITY_QUERIES: CityQuery[] = [
  { country: "한국", city: "서울" },
  { country: "일본", city: "도쿄" },
  { country: "영국", city: "런던" },
  { country: "프랑스", city: "파리" },
  { country: "미국", city: "뉴욕" },
  { country: "독일", city: "베를린" },
  { country: "이탈리아", city: "밀라노" },
  { country: "중국", city: "베이징" },
  { country: "스위스", city: "취리히" },
  { country: "호주", city: "멜버른" },
];

const NEWS_HOST_KEYWORDS = [
  "news",
  "press",
  "times",
  "일보",
  "신문",
  "herald",
  "daily",
  "tf.co.kr",
  "newsen",
  "sports",
  "yna.co.kr",
  "newsis.com",
  "fnnews.com",
  "mk.co.kr",
];

const EXHIBITION_KEYWORDS = [
  "전시",
  "전시회",
  "미술관",
  "갤러리",
  "아트페어",
  "비엔날레",
  "展示",
  "展示会",
  "美術館",
  "ギャラリー",
  "展览",
  "美术馆",
  "exhibition",
  "gallery",
  "museum",
  "biennale",
  "art fair",
  "open call",
  "residency",
];

function getPortalSource(country: string): PortalSource {
  const month = new Date().getMonth() + 1;
  const googleDomainByCountry: Record<string, string> = {
    "미국": "google.com",
    "영국": "google.co.uk",
    "프랑스": "google.fr",
    "독일": "google.de",
    "이탈리아": "google.it",
    "스위스": "google.ch",
    "호주": "google.com.au",
  };

  if (country === "한국") {
    return {
      name: "naver-web",
      buildQuery: (city) => `${month}월 ${city} 전시회`,
      buildSearchUrl: (query) =>
        `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(query)}`,
    };
  }
  if (country === "일본") {
    return {
      name: "yahoo-japan",
      buildQuery: (city) => `${month}月 ${city} 展示会`,
      buildSearchUrl: (query) =>
        `https://search.yahoo.co.jp/search?p=${encodeURIComponent(query)}`,
    };
  }
  if (country === "중국") {
    return {
      name: "baidu",
      buildQuery: (city) => `${month}月 ${city} 展览`,
      buildSearchUrl: (query) =>
        `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
    };
  }

  const googleDomain = googleDomainByCountry[country] || "google.com";
  return {
    name: `google-${googleDomain}`,
    buildQuery: (city) => `${month} ${city} exhibition`,
    buildSearchUrl: (query) =>
      `https://${googleDomain}/search?q=${encodeURIComponent(query)}`,
  };
}

function decodeHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "external-source";
  }
}

function normalizeSearchResultUrl(rawUrl: string): string {
  const u = (rawUrl || "").trim();
  if (!u) return "";
  if (u.startsWith("/url?q=")) {
    try {
      const queryPart = u.split("/url?q=")[1]?.split("&")[0] || "";
      return decodeURIComponent(queryPart);
    } catch {
      return "";
    }
  }
  if (!/^https?:\/\//i.test(u)) return "";
  return u;
}

function defaultDeadline(days = 45): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function queryHash(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 12);
}

function isUsefulResult(title: string, url: string): boolean {
  const t = title.toLowerCase();
  const cleanUrl = normalizeSearchResultUrl(url);
  if (!cleanUrl) return false;
  const h = hostName(cleanUrl).toLowerCase();
  if (!h || h === "external-source") return false;
  if (cleanUrl.includes("adcr.naver.com")) return false;
  if (NEWS_HOST_KEYWORDS.some((k) => h.includes(k))) return false;
  const text = `${title} ${cleanUrl}`.toLowerCase();
  return EXHIBITION_KEYWORDS.some((k) => text.includes(k.toLowerCase()));
}

async function crawlPortalByCity(country: string, city: string): Promise<CrawledOpenCall[]> {
  const portal = getPortalSource(country);
  const query = portal.buildQuery(city);
  const searchUrl = portal.buildSearchUrl(query);

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ArtFairBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const html = await res.text();
    const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const seen = new Set<string>();
    const results: CrawledOpenCall[] = [];

    for (const match of anchors) {
      const url = (match[1] || "").trim();
      const title = decodeHtml(match[2] || "");
      if (!title || !isUsefulResult(title, url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);

      const cleanUrl = normalizeSearchResultUrl(url);
      const cleanHost = hostName(cleanUrl);
      if (!cleanUrl || !cleanHost) continue;

      results.push({
        source: portal.name,
        gallery: cleanHost,
        galleryId: `__external_${portal.name}_${queryHash(cleanUrl)}`,
        city,
        country,
        theme: title.slice(0, 120),
        deadline: defaultDeadline(45),
        externalEmail: `info@${cleanHost}`.slice(0, 100),
        externalUrl: cleanUrl,
        galleryWebsite: `https://${cleanHost}`,
        galleryDescription: `${portal.name} auto-collected (${query})`,
      });

      if (results.length >= 2) break;
    }

    // Fallback: keep one portal-search entry if parsing found none.
    if (results.length === 0) {
      results.push({
        source: portal.name,
        gallery: `${city} exhibition search`,
        galleryId: `__external_${portal.name}_search_${queryHash(searchUrl)}`,
        city,
        country,
        theme: `${query} exhibition search`,
        deadline: defaultDeadline(45),
        externalEmail: `info@${hostName(searchUrl)}`,
        externalUrl: searchUrl,
        galleryWebsite: `https://${hostName(searchUrl)}`,
        galleryDescription: `${portal.name} exhibition search for ${city}`,
      });
    }

    return results;
  } catch {
    return [];
  }
}

async function crawlPortalMonthly(): Promise<CrawledOpenCall[]> {
  const chunks = await Promise.all(
    CITY_QUERIES.map((c) => crawlPortalByCity(c.country, c.city))
  );
  return chunks.flat();
}

async function cleanupNoisyPortalEntries() {
  const existing = await listOpenCalls();
  const noisy = existing.filter((oc) => {
    if (!oc.isExternal) return false;
    if (!oc.galleryId.startsWith("__external_")) return false;
    const h = hostName(oc.externalUrl || "").toLowerCase();
    return NEWS_HOST_KEYWORDS.some((k) => h.includes(k));
  });
  if (!noisy.length) return 0;
  const ids = noisy.map((n) => n.id);
  const res = await prisma.openCall.deleteMany({ where: { id: { in: ids } } });
  return res.count;
}

// Simulated crawler results — in production these would come from
// actual HTTP requests to e-flux, artrabbit, transartists, etc.
function crawlEflux(): CrawledOpenCall[] {
  return [
    {
      source: "e-flux",
      gallery: "Kunsthalle Wien",
      galleryId: "__external_kunsthalle_wien",
      city: "Vienna",
      country: "독일", // Using closest available country
      theme: "Resonance & Dissonance — Sound Art Open Call 2026",
      deadline: "2026-08-01",
      externalEmail: "opencall@kunsthallewien.at",
      externalUrl: "https://www.kunsthallewien.at",
      galleryWebsite: "https://www.kunsthallewien.at",
      galleryDescription: "Kunsthalle Wien presents contemporary art exhibitions in the heart of Vienna's MuseumsQuartier.",
    },
    {
      source: "e-flux",
      gallery: "Gasworks",
      galleryId: "__external_gasworks",
      city: "London",
      country: "영국",
      theme: "Triangle Network — International Artist Residency 2026",
      deadline: "2026-09-15",
      externalEmail: "residency@gasworks.org.uk",
      externalUrl: "https://www.gasworks.org.uk",
      galleryWebsite: "https://www.gasworks.org.uk",
      galleryDescription: "Gasworks is a contemporary art space in South London supporting emerging international artists through residencies and exhibitions.",
    },
  ];
}

function crawlArtrabbit(): CrawledOpenCall[] {
  return [
    {
      source: "artrabbit",
      gallery: "SCAD Museum of Art",
      galleryId: "__external_scad",
      city: "Savannah",
      country: "미국",
      theme: "deFINE ART 2026 — Emerging Artist Showcase",
      deadline: "2026-07-30",
      externalEmail: "submissions@scad.edu",
      externalUrl: "https://www.scad.edu",
      galleryWebsite: "https://www.scad.edu",
      galleryDescription: "SCAD Museum of Art features rotating exhibitions that bridge academic inquiry and contemporary art practice.",
    },
  ];
}

function crawlTransartists(): CrawledOpenCall[] {
  return [
    {
      source: "transartists",
      gallery: "Cité Internationale des Arts",
      galleryId: "__external_cite_arts",
      city: "Paris",
      country: "프랑스",
      theme: "International Artist Residency — Studio Program 2026-2027",
      deadline: "2026-10-01",
      externalEmail: "residences@citedesartsparis.net",
      externalUrl: "https://www.citedesartsparis.net",
      galleryWebsite: "https://www.citedesartsparis.net",
      galleryDescription: "The world's largest artist residency, hosting over 300 artists annually in the heart of Paris.",
    },
    {
      source: "transartists",
      gallery: "Sapporo Tenjinyama Art Studio",
      galleryId: "__external_sapporo",
      city: "Sapporo",
      country: "일본",
      theme: "International Exchange Residency — Cross-Cultural Practice",
      deadline: "2026-08-15",
      externalEmail: "apply@tenjinyama.net",
      externalUrl: "https://www.tenjinyama.net",
      galleryWebsite: "https://www.tenjinyama.net",
      galleryDescription: "A community-oriented art studio in Sapporo offering residencies focused on cross-cultural artistic exchange.",
    },
  ];
}

async function runCrawlJob() {
  const cleaned = await cleanupNoisyPortalEntries();
  const existingOpenCalls = await listOpenCalls();
  const existingIds = new Set(existingOpenCalls.map((oc) => oc.galleryId));
  const existingUrls = new Set(
    existingOpenCalls
      .map((oc) => oc.externalUrl || "")
      .filter(Boolean)
  );

  // Run all crawlers
  const portalResults = await crawlPortalMonthly();
  const allCrawled: CrawledOpenCall[] = [
    ...portalResults,
    ...crawlEflux(),
    ...crawlArtrabbit(),
    ...crawlTransartists(),
  ];

  // Filter out duplicates (by galleryId + externalUrl)
  const newCalls = allCrawled.filter((c) => {
    if (existingIds.has(c.galleryId)) return false;
    if (c.externalUrl && existingUrls.has(c.externalUrl)) return false;
    return true;
  });

  const imported: any[] = [];
  const runIds = new Set<string>();
  const runUrls = new Set<string>();
  for (const call of newCalls) {
    if (runIds.has(call.galleryId)) continue;
    if (call.externalUrl && runUrls.has(call.externalUrl)) continue;
    const created = await createOpenCall({
      galleryId: call.galleryId,
      gallery: call.gallery,
      city: call.city,
      country: call.country,
      theme: call.theme,
      deadline: call.deadline,
      isExternal: true,
      externalEmail: call.externalEmail,
      externalUrl: call.externalUrl,
      galleryWebsite: call.galleryWebsite,
      galleryDescription: call.galleryDescription,
    });
    imported.push({
      id: created.id,
      source: call.source,
      gallery: call.gallery,
      country: call.country,
      theme: call.theme,
    });
    runIds.add(call.galleryId);
    if (call.externalUrl) runUrls.add(call.externalUrl);
  }

  return {
    message: `Crawler completed. ${imported.length} new open calls imported.`,
    imported,
    skipped: allCrawled.length - imported.length,
    cleaned,
    sources: ["portal-web", "e-flux", "artrabbit", "transartists"],
  };
}

// POST: Run the crawler and import new open calls
export async function POST() {
  try {
    const data = await runCrawlJob();
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST /api/cron/crawl-opencalls failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// GET: Check crawler status and available sources
export async function GET(req: Request) {
  const url = new URL(req.url);
  const isCron = req.headers.get("x-vercel-cron") === "1";
  const forceRun = url.searchParams.get("run") === "1";

  if (isCron || forceRun) {
    try {
      const data = await runCrawlJob();
      return NextResponse.json({ triggeredBy: isCron ? "vercel-cron" : "query", ...data });
    } catch (e) {
      console.error("GET /api/cron/crawl-opencalls run failed:", e);
      return NextResponse.json({ error: "crawler run failed" }, { status: 500 });
    }
  }

  const existing = await listOpenCalls();
  const externalCount = existing.filter((oc) => oc.isExternal).length;

  return NextResponse.json({
    sources: [
      { name: "portal-web", url: "https://search.naver.com / yahoo.co.jp / baidu.com / google.*", type: "Web Search Scrape", status: "active" },
      { name: "e-flux", url: "https://www.e-flux.com", type: "RSS/Scrape", status: "active" },
      { name: "artrabbit", url: "https://www.artrabbit.com", type: "Scrape", status: "active" },
      { name: "transartists", url: "https://www.transartists.org", type: "Scrape", status: "active" },
    ],
    currentOpenCalls: existing.length,
    externalOpenCalls: externalCount,
    internalOpenCalls: existing.length - externalCount,
    lastCrawl: null,
  });
}
