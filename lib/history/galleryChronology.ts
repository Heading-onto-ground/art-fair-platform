import { aliasLookupEqual, normalizeArtistLookup } from "@/lib/history/identity";

export type ChronologyRow = {
  section: string;
  year: number;
  title: string;
  venue: string;
  city: string | null;
  country: string | null;
};

const EXHIBITION_SECTIONS = new Set([
  "selected solo exhibitions",
  "solo exhibitions",
  "selected group exhibitions",
  "group exhibitions",
  "selected exhibitions",
]);

function clean(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function sectionName(value: string): string {
  return clean(value).toLowerCase();
}

export function textHasExactAlias(text: string, alias: string): boolean {
  const name = normalizeArtistLookup(alias);
  if (name.length < 3) return false;
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    decoded = text;
  }
  const folded = ` ${normalizeArtistLookup(decoded.replace(/[^\p{L}\p{N}]+/gu, " "))} `;
  return folded.includes(` ${name} `);
}

export function chronologySubject(html: string, aliases: readonly string[]): string | null {
  const headings = [...html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)].map((match) => clean(match[1] ?? ""));
  for (const alias of aliases) {
    if (headings.some((heading) => aliasLookupEqual(heading, alias))) return alias;
  }
  return null;
}

export function galleryChronologyRows(html: string): ChronologyRow[] {
  const rows: ChronologyRow[] = [];
  const sections = html.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>([\s\S]*?)(?=<h4\b|$)/gi);
  for (const section of sections) {
    const heading = clean(section[1] ?? "");
    if (!EXHIBITION_SECTIONS.has(sectionName(heading))) continue;
    let year: number | null = null;
    for (const chunk of (section[2] ?? "").split(/<br\s*\/?>/i)) {
      const text = clean(chunk);
      if (/^(19|20)\d{2}$/.test(text)) {
        year = Number(text);
        continue;
      }
      const emphasized = chunk.match(/<em>([\s\S]*?)<\/em>/i);
      if (!emphasized || year == null) continue;
      const title = clean(emphasized[1] ?? "").replace(/,\s*$/, "");
      const rest = clean(chunk.replace(/<em>[\s\S]*?<\/em>/i, ""));
      const parts = rest.split(",").map((part) => part.trim()).filter(Boolean);
      if (title.length < 2 || parts.length < 2) continue;
      const country = parts.length >= 3 ? parts[parts.length - 1] ?? null : null;
      const city = parts.length >= 3 ? parts[parts.length - 2] ?? null : parts[parts.length - 1] ?? null;
      const venue = parts.slice(0, parts.length >= 3 ? -2 : -1).join(", ");
      if (!venue || !city) continue;
      rows.push({ section: heading, year, title, venue, city, country });
    }
  }
  return rows;
}

export function exactDirectoryLinks(html: string, aliases: readonly string[], pageUrl: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1] ?? "";
    const text = clean(match[2] ?? "");
    if (!/artists\/view/i.test(href) || !aliases.some((alias) => textHasExactAlias(text, alias))) continue;
    try {
      const url = new URL(href, pageUrl);
      const page = new URL(pageUrl);
      if (url.hostname.replace(/^www\./, "") !== page.hostname.replace(/^www\./, "")) continue;
      if (!found.includes(url.href)) found.push(url.href);
    } catch {
      continue;
    }
  }
  return found;
}

export function aliasSitemapUrls(xml: string, aliases: readonly string[], limit = 3): string[] {
  const found: string[] = [];
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    const url = clean(match[1] ?? "");
    if (!url || !aliases.some((alias) => textHasExactAlias(url, alias))) continue;
    if (!found.includes(url)) found.push(url);
    if (found.length >= limit) break;
  }
  return found;
}
