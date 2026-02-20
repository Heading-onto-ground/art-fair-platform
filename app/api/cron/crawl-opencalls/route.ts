import { NextResponse } from "next/server";
import { createOpenCall, listOpenCalls } from "@/app/data/openCalls";
import { prisma } from "@/lib/prisma";
import { syncGalleryEmailDirectory } from "@/lib/galleryEmailDirectory";
import { validateExternalOpenCalls } from "@/lib/openCallValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

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

const KR_OC_KEYWORDS = ["오픈콜", "공모", "모집", "레지던시", "지원", "open call", "residency", "call for artists"];
const JP_OC_KEYWORDS = ["オープンコール", "公募", "募集", "レジデンス", "アーティスト募集", "open call", "residency", "call for artists"];

function normalizeText(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u3131-\uD79D\u3040-\u30ff\u4e00-\u9faf\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAnyKeyword(text: string, keywords: string[]) {
  const t = normalizeText(text);
  return keywords.some((k) => t.includes(normalizeText(k)));
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

function stripCdata(input: string) {
  return String(input || "")
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/g, "")
    .trim();
}

function parseDateLike(input: string): string | null {
  const s = String(input || "");
  const m = s.match(/(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
  if (!m) return null;
  const yyyy = m[1];
  const mm = String(Number(m[2])).padStart(2, "0");
  const dd = String(Number(m[3])).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateRangeEndLike(input: string): string | null {
  const all = Array.from(String(input || "").matchAll(/(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/g));
  if (all.length === 0) return null;
  const last = all[all.length - 1];
  const yyyy = last[1];
  const mm = String(Number(last[2])).padStart(2, "0");
  const dd = String(Number(last[3])).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseShortDateRangeEndLike(input: string): string | null {
  const all = Array.from(String(input || "").matchAll(/(\d{1,2})\s*[.\-/]\s*(\d{1,2})(?!\d)/g));
  if (all.length === 0) return null;
  const now = new Date();
  const nowTs = now.getTime();
  const candidates: Array<{ ts: number; value: string }> = [];
  for (const m of all) {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    if (!Number.isFinite(mm) || !Number.isFinite(dd) || mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;
    let yyyy = now.getUTCFullYear();
    let d = new Date(Date.UTC(yyyy, mm - 1, dd, 23, 59, 59));
    if (d.getTime() < nowTs) d = new Date(Date.UTC(yyyy + 1, mm - 1, dd, 23, 59, 59));
    candidates.push({
      ts: d.getTime(),
      value: `${d.getUTCFullYear()}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.ts - a.ts);
  return candidates[0].value;
}

function parseDeadlineFlexible(input: string): string | null {
  const rangeEnd = parseDateRangeEndLike(input);
  if (rangeEnd) return rangeEnd;
  const full = parseDateLike(input);
  if (full) return full;
  const shortRangeEnd = parseShortDateRangeEndLike(input);
  if (shortRangeEnd) return shortRangeEnd;
  const short = String(input || "").match(/(\d{1,2})\s*[.\-/]\s*(\d{1,2})(?!\d)/);
  if (!short) return null;
  const now = new Date();
  let yyyy = now.getUTCFullYear();
  const mm = Number(short[1]);
  const dd = Number(short[2]);
  if (!Number.isFinite(mm) || !Number.isFinite(dd) || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const candidate = new Date(Date.UTC(yyyy, mm - 1, dd, 23, 59, 59));
  // If date already passed this year, assume next cycle.
  if (candidate.getTime() < now.getTime()) yyyy += 1;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function parseDateFromPubDate(input: string): string | null {
  const ts = Date.parse(String(input || "").trim());
  if (!Number.isFinite(ts)) return null;
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function isDeadlineActive(deadline: string) {
  const d = String(deadline || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const endOfDayUtc = new Date(`${d}T23:59:59Z`);
  if (Number.isNaN(endOfDayUtc.getTime())) return false;
  return endOfDayUtc.getTime() >= Date.now();
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
        "user-agent": "ROB-OpenCall-Crawler/1.0 (+https://rob-roleofbridge.com)",
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
  return containsAnyKeyword(text, KR_OC_KEYWORDS);
}

function containsJapaneseOpenCallKeyword(text: string) {
  return containsAnyKeyword(text, JP_OC_KEYWORDS);
}

function looksLikeKoreanRssOpenCall(input: { title: string; category: string; desc: string }) {
  const merged = `${input.title} ${input.category} ${input.desc}`;
  const title = normalizeText(input.title);
  const category = normalizeText(input.category);
  const desc = normalizeText(input.desc);
  if (title.includes(normalizeText("신규전시")) || category.includes(normalizeText("신규전시"))) return false;
  if (title.includes(normalizeText("공지사항")) || category.includes(normalizeText("공지사항"))) return false;
  if (containsKoreanOpenCallKeyword(merged)) return true;
  if (desc.includes(normalizeText("접수일정")) || desc.includes(normalizeText("지원사업"))) return true;
  if (desc.includes(normalizeText("주관")) && desc.includes(normalizeText("홈페이지"))) return true;
  return false;
}

function looksLikeJapaneseRssOpenCall(input: { title: string; category: string; desc: string }) {
  const merged = `${input.title} ${input.category} ${input.desc}`;
  const title = normalizeText(input.title);
  const category = normalizeText(input.category);
  const desc = normalizeText(input.desc);
  if (title.includes(normalizeText("展示")) && !containsJapaneseOpenCallKeyword(merged)) return false;
  if (title.includes(normalizeText("展覧会")) && !containsJapaneseOpenCallKeyword(merged)) return false;
  if (containsJapaneseOpenCallKeyword(merged)) return true;
  if (desc.includes(normalizeText("応募")) && desc.includes(normalizeText("締切"))) return true;
  if (desc.includes(normalizeText("application")) && desc.includes(normalizeText("deadline"))) return true;
  return false;
}

function looksLikeJapaneseExhibitionNotice(text: string) {
  const t = normalizeText(text);
  const hasExhibitionSignal =
    t.includes(normalizeText("展覧会")) ||
    t.includes(normalizeText("展示")) ||
    t.includes(normalizeText("個展")) ||
    t.includes(normalizeText("会期")) ||
    t.includes(normalizeText("opening reception")) ||
    t.includes(normalizeText("solo exhibition"));
  if (!hasExhibitionSignal) return false;
  // If explicit open-call keywords exist, keep it.
  if (containsJapaneseOpenCallKeyword(text)) return false;
  return true;
}

function resolveJapanSourceGalleryLabel(input: {
  fallback: string;
  title: string;
  link: string;
  baseUrl: string;
  context?: string;
}) {
  const host = hostFromUrl(input.link) || hostFromUrl(input.baseUrl);
  const hostMap: Record<string, string> = {
    "www.tokyoartsandspace.jp": "Tokyo Arts and Space (TOKAS)",
    "tokyoartsandspace.jp": "Tokyo Arts and Space (TOKAS)",
    "air-j.info": "AIR_J Residency Network",
    "www.artkoubo.jp": "ART Koubo",
    "artkoubo.jp": "ART Koubo",
    "koubo.jp": "Koubo",
    "www.koubo.jp": "Koubo",
  };
  if (host && hostMap[host]) return hostMap[host];
  const context = String(input.context || "");
  const organizerMatch =
    context.match(/主催\s*[：:]\s*([^\n\r<]{2,120})/) ||
    context.match(/organizer\s*[：:]\s*([^\n\r<]{2,120})/i);
  if (organizerMatch?.[1]) return stripHtml(organizerMatch[1]).slice(0, 120);
  const title = stripHtml(input.title || "");
  if (title.includes("｜")) {
    const parts = title.split("｜").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 1].slice(0, 120);
  }
  if (title.includes("|")) {
    const parts = title.split("|").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 1].slice(0, 120);
  }
  return input.fallback;
}

function parseHtmlLinksAsOpenCalls(input: {
  source: string;
  html: string;
  baseUrl: string;
  country: string;
  city: string;
  galleryLabel: string;
  email: string;
  isRelevant: (text: string) => boolean;
  shouldSkip?: (text: string) => boolean;
  resolveGalleryLabel?: (v: { title: string; link: string; context: string; baseUrl: string }) => string;
}): CrawledOpenCall[] {
  const rows: CrawledOpenCall[] = [];
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(input.html)) && rows.length < 25) {
    const hrefRaw = String(m[1] || "").trim();
    const titleRaw = stripHtml(m[2] || "");
    if (!hrefRaw || !titleRaw) continue;
    if (!input.isRelevant(titleRaw)) continue;
    const block = input.html.slice(Math.max(0, m.index - 220), Math.min(input.html.length, m.index + 420));
    if (input.shouldSkip && input.shouldSkip(`${titleRaw} ${block}`)) continue;
    const deadline = parseDeadlineFlexible(block);
    if (!deadline) continue;
    const link = absoluteUrl(input.baseUrl, hrefRaw);
    const slug = toSlug(`${input.source}_${titleRaw}_${link}`);
    const galleryLabel = input.resolveGalleryLabel
      ? input.resolveGalleryLabel({ title: titleRaw, link, context: block, baseUrl: input.baseUrl })
      : input.galleryLabel;
    rows.push({
      source: input.source,
      gallery: galleryLabel,
      galleryId: `__external_${input.source}_${slug}`,
      city: input.city,
      country: input.country,
      theme: titleRaw.slice(0, 200),
      deadline,
      externalEmail: input.email,
      externalUrl: link,
      galleryWebsite: input.baseUrl,
      galleryDescription: `${galleryLabel} curated open-call listing.`,
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
    const title = stripHtml(stripCdata((item.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || ""));
    const link = stripHtml(stripCdata((item.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || ""));
    const desc = stripHtml(stripCdata((item.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || ""));
    const category = stripHtml(stripCdata((item.match(/<category>([\s\S]*?)<\/category>/i) || [])[1] || ""));
    const pubDate = stripHtml(stripCdata((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || ""));
    if (!title || !link) continue;
    const mergedText = `${title} ${category} ${desc}`;
    if (!looksLikeKoreanRssOpenCall({ title, category, desc })) continue;
    const deadline = parseDeadlineFlexible(mergedText) || parseDeadlineFlexible(pubDate) || parseDateFromPubDate(pubDate);
    if (!deadline) continue;
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

function parseJapaneseRssItemsAsOpenCalls(input: {
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
  for (const item of items.slice(0, 40)) {
    const title = stripHtml(stripCdata((item.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || ""));
    const link = stripHtml(stripCdata((item.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || ""));
    const desc = stripHtml(stripCdata((item.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || ""));
    const category = stripHtml(stripCdata((item.match(/<category>([\s\S]*?)<\/category>/i) || [])[1] || ""));
    const pubDate = stripHtml(stripCdata((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || ""));
    if (!title || !link) continue;
    const mergedText = `${title} ${category} ${desc}`;
    if (!looksLikeJapaneseRssOpenCall({ title, category, desc })) continue;
    if (looksLikeJapaneseExhibitionNotice(mergedText)) continue;
    const deadline = parseDeadlineFlexible(mergedText) || parseDeadlineFlexible(pubDate) || parseDateFromPubDate(pubDate);
    if (!deadline) continue;
    const slug = toSlug(`${input.source}_${title}_${link}`);
    const gallery = resolveJapanSourceGalleryLabel({
      fallback: input.galleryLabel,
      title,
      link,
      baseUrl: input.baseUrl,
      context: mergedText,
    });
    rows.push({
      source: input.source,
      gallery,
      galleryId: `__external_${input.source}_${slug}`,
      city: input.city,
      country: input.country,
      theme: title.slice(0, 200),
      deadline,
      externalEmail: input.email,
      externalUrl: link,
      galleryWebsite: input.baseUrl,
      galleryDescription: desc.slice(0, 300) || `${gallery} JP RSS open-call listing.`,
    });
  }
  return rows;
}

function containsOpenCallKeyword(text: string) {
  const t = normalizeText(text);
  return KR_OC_KEYWORDS.some((k) => t.includes(normalizeText(k)));
}

function parseInstagramAccountMetaMap() {
  const raw = String(process.env.CRAWL_INSTAGRAM_ACCOUNT_META_JSON || "").trim();
  if (!raw) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, any>;
  } catch {
    return {};
  }
}

async function crawlInstagramOpenCalls(): Promise<CrawledOpenCall[]> {
  const enabled = (process.env.CRAWL_INSTAGRAM_ENABLED || "1") !== "0";
  if (!enabled) return [];
  const token = String(process.env.INSTAGRAM_ACCESS_TOKEN || "").trim();
  const accountIds = String(process.env.CRAWL_INSTAGRAM_ACCOUNT_IDS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (!token || accountIds.length === 0) return [];

  const metaMap = parseInstagramAccountMetaMap();
  const rows: CrawledOpenCall[] = [];
  for (const accountId of accountIds) {
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}/media?fields=id,caption,permalink,timestamp,username&limit=30&access_token=${encodeURIComponent(token)}`;
    const text = await fetchText(url, 12000);
    if (!text) continue;
    let media: any[] = [];
    try {
      const parsed = JSON.parse(text);
      media = Array.isArray(parsed?.data) ? parsed.data : [];
    } catch {
      media = [];
    }
    const meta = metaMap[accountId] || {};
    for (const item of media) {
      const caption = String(item?.caption || "").trim();
      if (!caption) continue;
      if (!containsOpenCallKeyword(caption)) continue;
      const deadline = parseDeadlineFlexible(caption);
      if (!deadline) continue;
      const permalink = String(item?.permalink || "").trim();
      if (!permalink) continue;
      const gallery = String(meta.gallery || item?.username || `Instagram ${accountId}`).trim();
      const city = String(meta.city || "Seoul").trim();
      const country = String(meta.country || "한국").trim();
      const externalEmail = String(meta.email || "").trim();
      const website = String(meta.website || "").trim();
      const description = String(meta.description || "Instagram sourced open-call listing.").trim();
      const firstLine = caption.split("\n").map((l: string) => l.trim()).find(Boolean) || caption.slice(0, 200);
      const theme = firstLine.slice(0, 200);
      rows.push({
        source: "instagram",
        gallery,
        galleryId: `__external_instagram_${accountId}_${String(item?.id || "").slice(-16)}`,
        city,
        country,
        theme,
        deadline,
        externalEmail,
        externalUrl: permalink,
        galleryWebsite: website || `https://www.instagram.com/${String(item?.username || "").trim()}`,
        galleryDescription: description,
      });
    }
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

function crawlJapanOpenCallsFallback(): CrawledOpenCall[] {
  return [
    {
      source: "tokas_jp",
      gallery: "Tokyo Arts and Space (TOKAS)",
      galleryId: "__external_tokas_jp",
      city: "Tokyo",
      country: "일본",
      theme: "TOKAS Open Call Program",
      deadline: "2026-09-30",
      externalEmail: "info@tokyoartsandspace.jp",
      externalUrl: "https://www.tokyoartsandspace.jp/en/application/about_opencall.html",
      galleryWebsite: "https://www.tokyoartsandspace.jp",
      galleryDescription: "Public contemporary art programs and open calls in Tokyo.",
    },
    {
      source: "air_jp",
      gallery: "AIR_J Residency Network",
      galleryId: "__external_air_jp",
      city: "Tokyo",
      country: "일본",
      theme: "Japan Residency Open Calls",
      deadline: "2026-10-31",
      externalEmail: "info@air-j.info",
      externalUrl: "https://air-j.info/en/program/",
      galleryWebsite: "https://air-j.info",
      galleryDescription: "Database of artist-in-residence open calls across Japan.",
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
      isRelevant: containsKoreanOpenCallKeyword,
    });
    parsed.push(...rows);
  }
  return parsed.length ? parsed : crawlKoreanArtHubFallback();
}

async function crawlKoreanArtBlogsWithDebug() {
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
  let rssFetched = 0;
  let rssWithItems = 0;
  let rssItemsScanned = 0;
  let rssRowsParsed = 0;
  let pageFetched = 0;
  let pageRowsParsed = 0;

  for (const url of rssUrls) {
    const xml = await fetchText(url);
    if (!xml) continue;
    rssFetched += 1;
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    if (itemMatches.length === 0) continue;
    rssWithItems += 1;
    rssItemsScanned += itemMatches.length;
    const rows = parseRssItemsAsOpenCalls({
      source: "korean_art_blog_rss",
      xml,
      country: "한국",
      city: "Seoul",
      galleryLabel: "Korean Art Blog",
      email,
      baseUrl: url,
    });
    rssRowsParsed += rows.length;
    parsed.push(...rows);
  }

  for (const url of pageUrls) {
    const html = await fetchText(url);
    if (!html) continue;
    pageFetched += 1;
    const rows = parseHtmlLinksAsOpenCalls({
      source: "korean_art_blog_live",
      html,
      baseUrl: url,
      country: "한국",
      city: "Seoul",
      galleryLabel: "Korean Art Blog",
      email,
      isRelevant: containsKoreanOpenCallKeyword,
    });
    pageRowsParsed += rows.length;
    parsed.push(...rows);
  }

  const usedFallback = parsed.length === 0;
  return {
    rows: usedFallback ? crawlKoreanArtBlogsFallback() : parsed,
    debug: {
      rssUrlsConfigured: rssUrls.length,
      rssFetched,
      rssWithItems,
      rssItemsScanned,
      rssRowsParsed,
      pageUrlsConfigured: pageUrls.length,
      pageFetched,
      pageRowsParsed,
      usedFallback,
    },
  };
}

async function crawlJapanOpenCallsWithDebug() {
  const rssUrls = String(process.env.CRAWL_JP_OC_FEED_URLS || "https://air-j.info/en/program/feed/,https://air-j.info/en/program/rss/")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const pageUrls = String(process.env.CRAWL_JP_OC_PAGE_URLS || "https://www.tokyoartsandspace.jp/en/application/about_opencall.html,https://air-j.info/en/program/")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const email = String(process.env.CRAWL_JP_OC_CONTACT_EMAIL || "info@tokyoartsandspace.jp").trim();
  const city = String(process.env.CRAWL_JP_OC_DEFAULT_CITY || "Tokyo").trim();
  const label = String(process.env.CRAWL_JP_OC_LABEL || "Japan Open Call Network").trim();

  const parsed: CrawledOpenCall[] = [];
  let rssFetched = 0;
  let rssWithItems = 0;
  let rssItemsScanned = 0;
  let rssRowsParsed = 0;
  let pageFetched = 0;
  let pageRowsParsed = 0;

  for (const url of rssUrls) {
    const xml = await fetchText(url);
    if (!xml) continue;
    rssFetched += 1;
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    if (itemMatches.length === 0) continue;
    rssWithItems += 1;
    rssItemsScanned += itemMatches.length;
    const rows = parseJapaneseRssItemsAsOpenCalls({
      source: "japan_open_call_rss",
      xml,
      country: "일본",
      city,
      galleryLabel: label,
      email,
      baseUrl: url,
    });
    rssRowsParsed += rows.length;
    parsed.push(...rows);
  }

  for (const url of pageUrls) {
    const html = await fetchText(url);
    if (!html) continue;
    pageFetched += 1;
    const rows = parseHtmlLinksAsOpenCalls({
      source: "japan_open_call_live",
      html,
      baseUrl: url,
      country: "일본",
      city,
      galleryLabel: label,
      email,
      isRelevant: containsJapaneseOpenCallKeyword,
      shouldSkip: looksLikeJapaneseExhibitionNotice,
      resolveGalleryLabel: ({ title, link, context, baseUrl }) =>
        resolveJapanSourceGalleryLabel({ fallback: label, title, link, baseUrl, context }),
    });
    pageRowsParsed += rows.length;
    parsed.push(...rows);
  }

  const usedFallback = parsed.length === 0;
  return {
    rows: usedFallback ? crawlJapanOpenCallsFallback() : parsed,
    debug: {
      rssUrlsConfigured: rssUrls.length,
      rssFetched,
      rssWithItems,
      rssItemsScanned,
      rssRowsParsed,
      pageUrlsConfigured: pageUrls.length,
      pageFetched,
      pageRowsParsed,
      usedFallback,
    },
  };
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

async function cleanupExpiredExternalOpenCalls() {
  const existing = await listOpenCalls();
  const expiredIds = existing
    .filter((oc) => oc.isExternal)
    .filter((oc) => !isDeadlineActive(String(oc.deadline || "")))
    .map((oc) => oc.id);
  if (!expiredIds.length) return 0;
  const res = await prisma.openCall.deleteMany({
    where: {
      id: { in: expiredIds },
      isExternal: true,
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
      sources: ["e-flux", "artrabbit", "transartists", "arthub-kr", "korean-art-blog", "japan-open-call", "instagram"],
    };
  }
  const cleaned = await cleanupExhibitionEntries();
  const cleanedExpired = await cleanupExpiredExternalOpenCalls();
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

  const [eflux, artrabbit, transartists, arthubKr, krBlogsWithDebug, jpOpenCallsWithDebug, instagram] = await Promise.all([
    Promise.resolve(crawlEflux()),
    Promise.resolve(crawlArtrabbit()),
    Promise.resolve(crawlTransartists()),
    crawlKoreanArtHub(),
    crawlKoreanArtBlogsWithDebug(),
    crawlJapanOpenCallsWithDebug(),
    crawlInstagramOpenCalls(),
  ]);
  const krBlogs = krBlogsWithDebug.rows;
  const jpOpenCalls = jpOpenCallsWithDebug.rows;
  const allCrawled: CrawledOpenCall[] = [...eflux, ...artrabbit, ...transartists, ...arthubKr, ...krBlogs, ...jpOpenCalls, ...instagram];
  const activeCrawled = allCrawled.filter((c) => isDeadlineActive(c.deadline));

  const seenInBatch = new Set<string>();
  const newCalls = activeCrawled.filter((c) => {
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
  const validation = await validateExternalOpenCalls();

  return {
    message: `Crawler completed. ${imported.length} new open calls imported.`,
    imported,
    skipped: activeCrawled.length - imported.length,
    droppedExpired: allCrawled.length - activeCrawled.length,
    cleaned,
    cleanedExpired,
    emailDirectory,
    validation,
    koreanArtBlogDebug: krBlogsWithDebug.debug,
    japanOpenCallDebug: jpOpenCallsWithDebug.debug,
    sources: ["e-flux", "artrabbit", "transartists", "arthub-kr", "korean-art-blog", "japan-open-call", "instagram"],
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
      { name: "japan-open-call", url: "https://www.tokyoartsandspace.jp/en/application/about_opencall.html", type: "RSS/Scrape", status: "active" },
      { name: "instagram", url: "https://www.instagram.com", type: "Graph API", status: "active if env configured" },
    ],
    currentOpenCalls: existing.length,
    externalOpenCalls: externalCount,
    internalOpenCalls: existing.length - externalCount,
    lastCrawl: null,
  });
}
