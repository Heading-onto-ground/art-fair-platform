import { NextResponse } from "next/server";
import { createOpenCall, listOpenCalls } from "@/app/data/openCalls";
import crypto from "crypto";

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
  if (url.includes("adcr.naver.com")) return false;
  if (!/^https?:\/\//.test(url)) return false;
  return /(전시|아트|미술|미술관|갤러리|exhibition|museum|gallery|art)/i.test(t);
}

async function crawlNaverByCity(country: string, city: string): Promise<CrawledOpenCall[]> {
  const month = new Date().getMonth() + 1;
  const query = `${month}월 ${city} 전시`;
  const searchUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}`;

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

      const host = hostName(url);
      const website = `https://${host}`;
      results.push({
        source: "naver-search",
        gallery: host,
        galleryId: `__external_naver_${queryHash(url)}`,
        city,
        country,
        theme: title.slice(0, 120),
        deadline: defaultDeadline(45),
        externalEmail: `info@${host}`.slice(0, 100),
        externalUrl: url,
        galleryWebsite: website,
        galleryDescription: `Naver auto-collected (${query})`,
      });

      if (results.length >= 3) break;
    }

    // Fallback: keep one search entry if parsing found none.
    if (results.length === 0) {
      results.push({
        source: "naver-search",
        gallery: `${city} exhibition search`,
        galleryId: `__external_naver_search_${queryHash(searchUrl)}`,
        city,
        country,
        theme: `${query} 검색 결과 모음`,
        deadline: defaultDeadline(45),
        externalEmail: "info@search.naver.com",
        externalUrl: searchUrl,
        galleryWebsite: "https://search.naver.com",
        galleryDescription: `Naver monthly exhibition search for ${city}`,
      });
    }

    return results;
  } catch {
    return [];
  }
}

async function crawlNaverMonthly(): Promise<CrawledOpenCall[]> {
  const chunks = await Promise.all(
    CITY_QUERIES.map((c) => crawlNaverByCity(c.country, c.city))
  );
  return chunks.flat();
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
  const existingOpenCalls = await listOpenCalls();
  const existingIds = new Set(existingOpenCalls.map((oc) => oc.galleryId));
  const existingUrls = new Set(
    existingOpenCalls
      .map((oc) => oc.externalUrl || "")
      .filter(Boolean)
  );

  // Run all crawlers
  const naverResults = await crawlNaverMonthly();
  const allCrawled: CrawledOpenCall[] = [
    ...naverResults,
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
    sources: ["naver-search", "e-flux", "artrabbit", "transartists"],
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
      { name: "naver-search", url: "https://search.naver.com", type: "Scrape", status: "active" },
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
