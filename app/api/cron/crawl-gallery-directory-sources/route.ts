// Scrapes public gallery directory (galleriesnow.net) to discover
// gallery website URLs → feeds into crawl-gallery-info for email extraction.
//
// Pipeline:
//   1. Fetch city listing page → extract gallery profile URLs
//   2. Fetch each gallery profile → extract real website URL (+ email if present)
//   3. Upsert to ExternalGalleryDirectory
//   4. crawl-gallery-info cron visits those websites and extracts emails

import { NextResponse } from "next/server";
import { upsertExternalGalleryDirectory } from "@/lib/externalGalleryDirectory";
import {
  canonicalizeDirectoryGalleries,
  type RawDirectoryGallery,
} from "@/lib/galleryDirectoryQuality";
import { isCronAuthorized as isCronRequestAuthorized } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ── Auth ──────────────────────────────────────────────────────────────────────
function isCronAuthorized(req: Request) {
  return isCronRequestAuthorized(req, {
    allowDevWithoutSecret: false,
    allowAdminSession: true,
  });
}

// ── Target cities ─────────────────────────────────────────────────────────────
// slug = galleriesnow.net URL path after /galleries/
type CityTarget = { country: string; city: string; slug: string };

const DEFAULT_CITIES: CityTarget[] = [
  // 한국
  { country: "한국", city: "Seoul", slug: "south-korea/seoul" },
  // 일본
  { country: "일본", city: "Tokyo", slug: "japan/tokyo" },
  { country: "일본", city: "Osaka", slug: "japan/osaka" },
  { country: "일본", city: "Kyoto", slug: "japan/kyoto" },
  { country: "일본", city: "Fukuoka", slug: "japan/fukuoka" },
  // 중국/아시아
  { country: "중국", city: "Beijing", slug: "china/beijing" },
  { country: "중국", city: "Shanghai", slug: "china/shanghai" },
  { country: "중국", city: "Shenzhen", slug: "china/shenzhen" },
  { country: "중국", city: "Guangzhou", slug: "china/guangzhou" },
  { country: "홍콩", city: "Hong Kong", slug: "hong-kong/hong-kong" },
  { country: "싱가포르", city: "Singapore", slug: "singapore/singapore" },
  { country: "대만", city: "Taipei", slug: "taiwan/taipei" },
  { country: "태국", city: "Bangkok", slug: "thailand/bangkok" },
  // 미국
  { country: "미국", city: "New York", slug: "usa/new-york" },
  { country: "미국", city: "Los Angeles", slug: "usa/los-angeles" },
  { country: "미국", city: "Chicago", slug: "usa/chicago" },
  { country: "미국", city: "Miami", slug: "usa/miami" },
  { country: "미국", city: "San Francisco", slug: "usa/san-francisco" },
  { country: "미국", city: "Houston", slug: "usa/houston" },
  { country: "미국", city: "Dallas", slug: "usa/dallas" },
  { country: "미국", city: "Washington DC", slug: "usa/washington-dc" },
  { country: "미국", city: "Boston", slug: "usa/boston" },
  { country: "미국", city: "Seattle", slug: "usa/seattle" },
  { country: "미국", city: "Atlanta", slug: "usa/atlanta" },
  // 캐나다
  { country: "캐나다", city: "Toronto", slug: "canada/toronto" },
  { country: "캐나다", city: "Vancouver", slug: "canada/vancouver" },
  { country: "캐나다", city: "Montreal", slug: "canada/montreal" },
  // 영국
  { country: "영국", city: "London", slug: "uk/london" },
  { country: "영국", city: "Manchester", slug: "uk/manchester" },
  { country: "영국", city: "Glasgow", slug: "uk/glasgow" },
  // 유럽
  { country: "프랑스", city: "Paris", slug: "france/paris" },
  { country: "프랑스", city: "Lyon", slug: "france/lyon" },
  { country: "독일", city: "Berlin", slug: "germany/berlin" },
  { country: "독일", city: "Cologne", slug: "germany/cologne" },
  { country: "독일", city: "Munich", slug: "germany/munich" },
  { country: "독일", city: "Hamburg", slug: "germany/hamburg" },
  { country: "이탈리아", city: "Milan", slug: "italy/milan" },
  { country: "이탈리아", city: "Rome", slug: "italy/rome" },
  { country: "이탈리아", city: "Venice", slug: "italy/venice" },
  { country: "스위스", city: "Basel", slug: "switzerland/basel" },
  { country: "스위스", city: "Zurich", slug: "switzerland/zurich" },
  { country: "네덜란드", city: "Amsterdam", slug: "netherlands/amsterdam" },
  { country: "네덜란드", city: "Rotterdam", slug: "netherlands/rotterdam" },
  { country: "벨기에", city: "Brussels", slug: "belgium/brussels" },
  { country: "스페인", city: "Madrid", slug: "spain/madrid" },
  { country: "스페인", city: "Barcelona", slug: "spain/barcelona" },
  { country: "포르투갈", city: "Lisbon", slug: "portugal/lisbon" },
  { country: "오스트리아", city: "Vienna", slug: "austria/vienna" },
  { country: "덴마크", city: "Copenhagen", slug: "denmark/copenhagen" },
  { country: "스웨덴", city: "Stockholm", slug: "sweden/stockholm" },
  { country: "핀란드", city: "Helsinki", slug: "finland/helsinki" },
  { country: "노르웨이", city: "Oslo", slug: "norway/oslo" },
  { country: "아일랜드", city: "Dublin", slug: "ireland/dublin" },
  // 중동/남미
  { country: "UAE", city: "Dubai", slug: "uae/dubai" },
  { country: "카타르", city: "Doha", slug: "qatar/doha" },
  { country: "브라질", city: "Sao Paulo", slug: "brazil/sao-paulo" },
  { country: "브라질", city: "Rio de Janeiro", slug: "brazil/rio-de-janeiro" },
  { country: "멕시코", city: "Mexico City", slug: "mexico/mexico-city" },
  { country: "아르헨티나", city: "Buenos Aires", slug: "argentina/buenos-aires" },
  // 오세아니아
  { country: "호주", city: "Sydney", slug: "australia/sydney" },
  { country: "호주", city: "Melbourne", slug: "australia/melbourne" },
  { country: "호주", city: "Brisbane", slug: "australia/brisbane" },
  { country: "뉴질랜드", city: "Auckland", slug: "new-zealand/auckland" },
];

const BASE_URL = "https://www.galleriesnow.net";
const DELAY_MS = 400; // polite crawl delay between requests

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function fetchHtml(url: string, timeoutMs = 12000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": "ROB-GalleryDiscovery/1.0 (+https://rob-roleofbridge.com)",
        accept: "text/html,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Parsers ───────────────────────────────────────────────────────────────────

// Extract internal gallery profile links from a listing page
// galleriesnow.net links look like: href="/gallery/white-cube-london/"
function extractGalleryProfileLinks(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  // Match href="/gallery/..." style links
  const re = /href=["']\/gallery\/([a-zA-Z0-9_-]+)\/?["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const path = `/gallery/${m[1]}/`;
    if (!seen.has(path)) {
      seen.add(path);
      results.push(path);
    }
  }
  return results;
}

function extractListingPaginationUrls(html: string, baseListingUrl: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const normalizedBase = baseListingUrl.replace(/\/+$/, "");
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = String(m[1] || "").trim();
    if (!href) continue;
    let absolute = "";
    try {
      absolute = new URL(href, `${normalizedBase}/`).toString();
    } catch {
      continue;
    }
    const normalized = absolute.replace(/\/+$/, "");
    if (!normalized.startsWith(normalizedBase)) continue;
    const hasPageSignal = /[?&](?:page|p)=\d+/i.test(normalized) || /\/page\/\d+$/i.test(normalized);
    if (!hasPageSignal) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }
  return urls;
}

// Extract the gallery's real website URL from their galleriesnow.net profile page
function extractWebsiteFromProfile(html: string): string | null {
  // Look for external links that look like gallery websites (not social media etc.)
  const externalLinkRe =
    /href=["'](https?:\/\/(?!(?:www\.)?galleriesnow\.net|instagram\.com|facebook\.com|twitter\.com|youtube\.com|t\.co|linkedin\.com|maps\.google|goo\.gl)[^\s"'<>]{4,})["']/gi;

  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = externalLinkRe.exec(html)) !== null) {
    const url = m[1].trim();
    // Filter out image files and common non-website links
    if (/\.(jpg|jpeg|png|gif|pdf|svg|webp|ico)($|\?)/i.test(url)) continue;
    if (url.includes("javascript:")) continue;
    candidates.push(url);
  }

  if (candidates.length === 0) return null;

  // Prefer links that look like gallery homepage (short path, no /article/ etc.)
  const homepageLike = candidates.find((u) => {
    try {
      const parsed = new URL(u);
      return parsed.pathname === "/" || parsed.pathname === "";
    } catch {
      return false;
    }
  });

  return homepageLike ?? candidates[0];
}

// Extract email from profile page HTML
function extractEmailFromProfile(html: string): string | null {
  const m = html.match(
    /\b([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b/
  );
  if (!m) return null;
  const email = m[1].toLowerCase();
  if (email.endsWith(".png") || email.endsWith(".jpg")) return null;
  if (email.includes("@galleriesnow")) return null;
  if (email.includes("@example")) return null;
  return email;
}

// Extract gallery name from profile page
function extractGalleryName(html: string): string | null {
  // Try <h1>
  const h1 = html.match(/<h1[^>]*>([^<]{3,80})<\/h1>/i);
  if (h1) return h1[1].replace(/&amp;/g, "&").replace(/&#\d+;/g, "").trim();
  // Try <title>
  const title = html.match(/<title[^>]*>([^<]{3,120})<\/title>/i);
  if (title) {
    const t = title[1].split(/[-|]/)[0].trim();
    if (t.length >= 3) return t;
  }
  return null;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Optional: limit to specific city slug, e.g. ?city=uk/london
  const cityFilter = searchParams.get("city") || null;
  // Per-run limit on profile page fetches (keeps runtime under 5 min)
  const maxProfiles = Number(
    searchParams.get("limit") ??
    process.env.CRAWL_GALLERY_DIRECTORY_PROFILE_LIMIT ??
    "900"
  );
  const perCityProfileLimit = Number(
    searchParams.get("perCityLimit") ??
    process.env.CRAWL_GALLERY_DIRECTORY_PER_CITY_LIMIT ??
    "200"
  );
  const maxPagesPerCity = Number(
    searchParams.get("maxPages") ??
    process.env.CRAWL_GALLERY_DIRECTORY_MAX_PAGES_PER_CITY ??
    "5"
  );

  const cities = cityFilter
    ? DEFAULT_CITIES.filter((c) => c.slug === cityFilter)
    : DEFAULT_CITIES;

  if (cities.length === 0) {
    return NextResponse.json({ ok: false, error: "no matching city" }, { status: 400 });
  }

  const raw: RawDirectoryGallery[] = [];
  const stats = {
    citiesAttempted: 0,
    citiesWithResults: 0,
    listingPagesFetched: 0,
    profilesFetched: 0,
    profilesWithWebsite: 0,
    profilesWithEmail: 0,
    errors: 0,
  };

  let totalProfilesSoFar = 0;

  outer: for (const target of cities) {
    stats.citiesAttempted++;
    const listingUrl = `${BASE_URL}/galleries/${target.slug}/`;

    const listingQueue = [listingUrl];
    const seenListingUrls = new Set<string>([listingUrl.replace(/\/+$/, "")]);
    const profilePathSet = new Set<string>();

    while (listingQueue.length > 0 && seenListingUrls.size <= maxPagesPerCity) {
      const url = String(listingQueue.shift() || "").trim();
      if (!url) continue;
      const listingHtml = await fetchHtml(url);
      await sleep(DELAY_MS);
      stats.listingPagesFetched++;
      if (!listingHtml) {
        stats.errors++;
        continue;
      }
      const profilePaths = extractGalleryProfileLinks(listingHtml);
      for (const p of profilePaths) profilePathSet.add(p);
      const paginationUrls = extractListingPaginationUrls(listingHtml, listingUrl);
      for (const nextUrl of paginationUrls) {
        if (seenListingUrls.size >= maxPagesPerCity) break;
        const key = nextUrl.replace(/\/+$/, "");
        if (seenListingUrls.has(key)) continue;
        seenListingUrls.add(key);
        listingQueue.push(nextUrl);
      }
    }

    const profilePaths = Array.from(profilePathSet).slice(0, Math.max(1, perCityProfileLimit));
    if (profilePaths.length === 0) {
      continue;
    }
    stats.citiesWithResults++;

    for (const profilePath of profilePaths) {
      if (totalProfilesSoFar >= maxProfiles) break outer;

      const profileUrl = `${BASE_URL}${profilePath}`;
      const profileHtml = await fetchHtml(profileUrl);
      await sleep(DELAY_MS);

      totalProfilesSoFar++;
      stats.profilesFetched++;

      if (!profileHtml) {
        stats.errors++;
        continue;
      }

      const website = extractWebsiteFromProfile(profileHtml);
      const email = extractEmailFromProfile(profileHtml);
      const name = extractGalleryName(profileHtml) ?? profilePath.replace(/\/gallery\/|\/$/g, "").replace(/-/g, " ");

      if (website) stats.profilesWithWebsite++;
      if (email) stats.profilesWithEmail++;

      raw.push({
        name,
        country: target.country,
        city: target.city,
        website: website ?? undefined,
        externalEmail: email ?? undefined,
        sourcePortal: "galleriesnow",
        sourceUrl: profileUrl,
      });
    }
  }

  // Canonicalize and upsert
  const canonical = canonicalizeDirectoryGalleries(raw);
  if (canonical.length > 0) {
    await upsertExternalGalleryDirectory(canonical);
  }

  return NextResponse.json({
    ok: true,
    ...stats,
    citiesConfigured: cities.length,
    maxProfiles,
    perCityProfileLimit,
    maxPagesPerCity,
    discovered: raw.length,
    upserted: canonical.length,
  });
}
