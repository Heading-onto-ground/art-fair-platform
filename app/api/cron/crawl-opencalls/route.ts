import { NextResponse } from "next/server";
import { createOpenCall, listOpenCalls } from "@/app/data/openCalls";
import { prisma } from "@/lib/prisma";
import { syncGalleryEmailDirectory } from "@/lib/galleryEmailDirectory";

export const dynamic = "force-dynamic";

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

const KR_OC_KEYWORDS = ["오픈콜", "공모", "레지던시", "지원", "open call", "residency", "call for artists"];

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

function openCallKey(input: {
  gallery: string;
  country: string;
  city: string;
  theme: string;
  deadline: string;
  externalUrl?: string;
  galleryWebsite?: string;
}) {
  const host = hostFromUrl(input.externalUrl || input.galleryWebsite);
  const gallery = normalizeText(input.gallery);
  const country = normalizeText(input.country);
  const city = normalizeText(input.city);
  const theme = normalizeText(input.theme);
  const deadline = String(input.deadline || "").trim();
  if (host) return `h:${host}|d:${deadline}|t:${theme}`;
  return `g:${gallery}|c:${country}|city:${city}|d:${deadline}|t:${theme}`;
}

function toSlug(input: string) {
  return normalizeText(input).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 80);
}

function stripHtml(input: string) {
  return String(input || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateLike(input: string): string | null {
  const s = String(input || "");
  const m = s.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!m) return null;
  const yyyy = m[1];
  const mm = String(Number(m[2])).padStart(2, "0");
  const dd = String(Number(m[3])).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function plusDays(base: Date, days: number): string {
  const d = new Date(base.getTime() + days * 86400000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function absoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "ROB-OpenCall-Crawler/1.0 (+https://www.rob-roleofbridge.com)",
        accept: "text/html,application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function containsKoreanOpenCallKeyword(text: string) {
  const t = normalizeText(text);
  return KR_OC_KEYWORDS.some((k) => t.includes(normalizeText(k)));
}

function parseHtmlLinksAsOpenCalls(input: {
  source: string;
  html: string;
  baseUrl: string;
  country: string;
  city: string;
  galleryLabel: string;
  email: string;
}): CrawledOpenCall[] {
  const rows: CrawledOpenCall[] = [];
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(input.html)) && rows.length < 25) {
    const hrefRaw = String(m[1] || "").trim();
    const titleRaw = stripHtml(m[2] || "");
    if (!hrefRaw || !titleRaw) continue;
    if (!containsKoreanOpenCallKeyword(titleRaw)) continue;
    const block = input.html.slice(Math.max(0, m.index - 220), Math.min(input.html.length, m.index + 420));
    const deadline = parseDateLike(block) || plusDays(new Date(), 30);
    const link = absoluteUrl(input.baseUrl, hrefRaw);
    const slug = toSlug(`${input.source}_${titleRaw}_${link}`);
    rows.push({
      source: input.source,
      gallery: input.galleryLabel,
      galleryId: `__external_${input.source}_${slug}`,
      city: input.city,
      country: input.country,
      theme: titleRaw.slice(0, 200),
      deadline,
      externalEmail: input.email,
      externalUrl: link,
      galleryWebsite: input.baseUrl,
      galleryDescription: `${input.galleryLabel} curated open-call listing.`,
    });
  }
  return rows;
}

function parseRssItemsAsOpenCalls(input: {
  source: string;
  xml: string;
  country: string;
  city: string;
  galleryLabel: string;
  email: string;
  baseUrl: string;
}): CrawledOpenCall[] {
  const items = input.xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const rows: CrawledOpenCall[] = [];
  for (const item of items.slice(0, 30)) {
    const title = stripHtml((item.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const link = stripHtml((item.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || "");
    const desc = stripHtml((item.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || "");
    const pubDate = stripHtml((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || "");
    if (!title || !link) continue;
    const mergedText = `${title} ${desc}`;
    if (!containsKoreanOpenCallKeyword(mergedText)) continue;
    const deadline = parseDateLike(mergedText) || parseDateLike(pubDate) || plusDays(new Date(), 45);
    const slug = toSlug(`${input.source}_${title}_${link}`);
    rows.push({
      source: input.source,
      gallery: input.galleryLabel,
      galleryId: `__external_${input.source}_${slug}`,
      city: input.city,
      country: input.country,
      theme: title.slice(0, 200),
      deadline,
      externalEmail: input.email,
      externalUrl: link,
      galleryWebsite: input.baseUrl,
      galleryDescription: desc.slice(0, 300) || `${input.galleryLabel} RSS open-call listing.`,
    });
  }
  return rows;
}

// Open-call sources only (no general exhibition scraping)
function crawlEflux(): CrawledOpenCall[] {
  return [
    {
      source: "e-flux",
      gallery: "Kunsthalle Wien",
      galleryId: "__external_kunsthalle_wien",
      city: "Vienna",
      country: "독일",
      theme: "Resonance & Dissonance — Sound Art Open Call 2026",
      deadline: "2026-08-01",
      externalEmail: "opencall@kunsthallewien.at",
      externalUrl: "https://www.kunsthallewien.at",
      galleryWebsite: "https://www.kunsthallewien.at",
      galleryDescription: "Kunsthalle Wien presents contemporary art exhibitions in Vienna.",
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
      galleryDescription: "Gasworks is a contemporary art space supporting international artists.",
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
      galleryDescription: "SCAD Museum of Art open call for emerging artists.",
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
      galleryDescription: "International residency program in Paris.",
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
      galleryDescription: "Residency focused on cross-cultural artistic exchange.",
    },
  ];
}

function crawlKoreanArtHubFallback(): CrawledOpenCall[] {
  return [
    {
      source: "arthub-kr",
      gallery: "ArtHub Korea Partner Space",
      galleryId: "__external_arthub_partner_space",
      city: "Seoul",
      country: "한국",
      theme: "Open Call 2026 — Emerging Korean & Global Artists",
      deadline: "2026-09-30",
      externalEmail: "opencall@arthub.co.kr",
      externalUrl: "https://arthub.co.kr",
      galleryWebsite: "https://arthub.co.kr",
      galleryDescription: "Korean open-call platform coverage for gallery opportunities.",
    },
    {
      source: "arthub-kr",
      gallery: "ArtHub Regional Program",
      galleryId: "__external_arthub_regional_program",
      city: "Busan",
      country: "한국",
      theme: "Regional Art Residency & Showcase Open Call",
      deadline: "2026-10-15",
      externalEmail: "program@arthub.co.kr",
      externalUrl: "https://arthub.co.kr",
      galleryWebsite: "https://arthub.co.kr",
      galleryDescription: "Regional residency and exhibition opportunities curated through ArtHub.",
    },
  ];
}

function crawlKoreanArtBlogsFallback(): CrawledOpenCall[] {
  return [
    {
      source: "korean-art-blog",
      gallery: "K-Art Open Call Blog Network",
      galleryId: "__external_kart_blog_network",
      city: "Seoul",
      country: "한국",
      theme: "Independent Space Open Call Roundup 2026",
      deadline: "2026-08-31",
      externalEmail: "editor@k-artblog.kr",
      externalUrl: "https://blog.naver.com",
      galleryWebsite: "https://blog.naver.com",
      galleryDescription: "Aggregated Korean art open-call listings from local blog channels.",
    },
  ];
}

async function crawlKoreanArtHub(): Promise<CrawledOpenCall[]> {
  const urls = String(process.env.CRAWL_ARTHUB_LIST_URLS || "https://arthub.co.kr")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const email = String(process.env.CRAWL_ARTHUB_CONTACT_EMAIL || "opencall@arthub.co.kr").trim();
  const parsed: CrawledOpenCall[] = [];
  for (const url of urls) {
    const html = await fetchText(url);
    if (!html) continue;
    const rows = parseHtmlLinksAsOpenCalls({
      source: "arthub_kr_live",
      html,
      baseUrl: url,
      country: "한국",
      city: "Seoul",
      galleryLabel: "ArtHub Korea",
      email,
    });
    parsed.push(...rows);
  }
  return parsed.length ? parsed : crawlKoreanArtHubFallback();
}

async function crawlKoreanArtBlogs(): Promise<CrawledOpenCall[]> {
  const rssUrls = String(process.env.CRAWL_KR_BLOG_FEED_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const pageUrls = String(process.env.CRAWL_KR_BLOG_PAGE_URLS || "https://blog.naver.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const email = String(process.env.CRAWL_KR_BLOG_CONTACT_EMAIL || "editor@k-artblog.kr").trim();

  const parsed: CrawledOpenCall[] = [];

  for (const url of rssUrls) {
    const xml = await fetchText(url);
    if (!xml || !xml.includes("<item")) continue;
    parsed.push(
      ...parseRssItemsAsOpenCalls({
        source: "korean_art_blog_rss",
        xml,
        country: "한국",
        city: "Seoul",
        galleryLabel: "Korean Art Blog",
        email,
        baseUrl: url,
      })
    );
  }

  for (const url of pageUrls) {
    const html = await fetchText(url);
    if (!html) continue;
    parsed.push(
      ...parseHtmlLinksAsOpenCalls({
        source: "korean_art_blog_live",
        html,
        baseUrl: url,
        country: "한국",
        city: "Seoul",
        galleryLabel: "Korean Art Blog",
        email,
      })
    );
  }

  return parsed.length ? parsed : crawlKoreanArtBlogsFallback();
}

// Remove previously crawled exhibition-style entries.
async function cleanupExhibitionEntries() {
  const res = await prisma.openCall.deleteMany({
    where: {
      isExternal: true,
      OR: [
        { galleryId: { startsWith: "__external_naver" } },
        { galleryId: { startsWith: "__external_yahoo" } },
        { galleryId: { startsWith: "__external_baidu" } },
        { galleryId: { startsWith: "__external_google" } },
        { theme: { contains: "exhibition search" } },
        { theme: { contains: "검색 결과 모음" } },
      ],
    },
  });
  return res.count;
}

async function runCrawlJob() {
  const enabled = (process.env.CRAWL_OPENCALLS_ENABLED || "1") !== "0";
  if (!enabled) {
    return {
      message: "Crawler disabled by CRAWL_OPENCALLS_ENABLED=0",
      imported: [],
      skipped: 0,
      cleaned: 0,
      sources: ["e-flux", "artrabbit", "transartists", "arthub-kr", "korean-art-blog"],
    };
  }
  const cleaned = await cleanupExhibitionEntries();
  const existingOpenCalls = await listOpenCalls();
  const existingIds = new Set(existingOpenCalls.map((oc) => oc.galleryId));
  const existingUrls = new Set(
    existingOpenCalls
      .map((oc) => oc.externalUrl || "")
      .filter(Boolean)
  );
  const existingKeys = new Set(
    existingOpenCalls.map((oc) =>
      openCallKey({
        gallery: oc.gallery,
        country: oc.country,
        city: oc.city,
        theme: oc.theme,
        deadline: oc.deadline,
        externalUrl: oc.externalUrl,
        galleryWebsite: oc.galleryWebsite,
      })
    )
  );

  const [eflux, artrabbit, transartists, arthubKr, krBlogs] = await Promise.all([
    Promise.resolve(crawlEflux()),
    Promise.resolve(crawlArtrabbit()),
    Promise.resolve(crawlTransartists()),
    crawlKoreanArtHub(),
    crawlKoreanArtBlogs(),
  ]);
  const allCrawled: CrawledOpenCall[] = [...eflux, ...artrabbit, ...transartists, ...arthubKr, ...krBlogs];

  const seenInBatch = new Set<string>();
  const newCalls = allCrawled.filter((c) => {
    const key = openCallKey(c);
    if (existingKeys.has(key)) return false;
    if (seenInBatch.has(key)) return false;
    if (existingIds.has(c.galleryId) && (!c.externalUrl || existingUrls.has(c.externalUrl))) return false;
    if (c.externalUrl && existingUrls.has(c.externalUrl)) return false;
    seenInBatch.add(key);
    return true;
  });

  const imported: any[] = [];
  for (const call of newCalls) {
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
  }

  const emailDirectory = await syncGalleryEmailDirectory();

  return {
    message: `Crawler completed. ${imported.length} new open calls imported.`,
    imported,
    skipped: allCrawled.length - imported.length,
    cleaned,
    emailDirectory,
    sources: ["e-flux", "artrabbit", "transartists", "arthub-kr", "korean-art-blog"],
  };
}

export async function POST() {
  try {
    const data = await runCrawlJob();
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST /api/cron/crawl-opencalls failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

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
      { name: "e-flux", url: "https://www.e-flux.com", type: "RSS/Scrape", status: "active" },
      { name: "artrabbit", url: "https://www.artrabbit.com", type: "Scrape", status: "active" },
      { name: "transartists", url: "https://www.transartists.org", type: "Scrape", status: "active" },
      { name: "arthub-kr", url: "https://arthub.co.kr", type: "Scrape", status: "active" },
      { name: "korean-art-blog", url: "https://blog.naver.com", type: "Scrape", status: "active" },
    ],
    currentOpenCalls: existing.length,
    externalOpenCalls: externalCount,
    internalOpenCalls: existing.length - externalCount,
    lastCrawl: null,
  });
}
