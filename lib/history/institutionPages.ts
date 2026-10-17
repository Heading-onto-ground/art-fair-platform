import { aliasLookupEqual } from "@/lib/history/identity";

export const PAGE_TYPES = [
  "EXHIBITION",
  "ARTIST_PROFILE",
  "COLLECTION_OBJECT",
  "PRESS",
  "ARCHIVE_INDEX",
  "UNKNOWN",
] as const;

export type PageType = (typeof PAGE_TYPES)[number];

export type ExhibitionFields = {
  title: string | null;
  dateText: string | null;
  startDate: string | null;
  endDate: string | null;
  venue: string | null;
  city: string | null;
  roster: string[];
  webUrl: string | null;
};

function clean(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
}

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function rows(json: unknown): Record<string, unknown>[] {
  const body = record(json);
  if (body && Array.isArray(body.data)) return body.data.filter((item): item is Record<string, unknown> => record(item) !== null);
  const single = body ? record(body.data) : null;
  if (single) return [single];
  if (Array.isArray(json)) return json.filter((item): item is Record<string, unknown> => record(item) !== null);
  return body ? [body] : [];
}

export function classifyFetchedPage(url: string, body: { html?: string; json?: unknown } = {}): PageType {
  const path = pathOf(url).toLowerCase();
  if (path.includes("/press") || path.includes("/news/")) return "PRESS";
  if (path === "/search" || path.startsWith("/search/")) return "UNKNOWN";
  const jsonRows = rows(body.json);
  const first = jsonRows[0];
  if (first && (typeof first.accession_number === "string" || Array.isArray(first.creators))) return "COLLECTION_OBJECT";
  if (first && (typeof first.opening_date === "string" || first.api_model === "exhibitions")) return "EXHIBITION";
  if (first && (first.api_model === "agents" || first.api_model === "artists")) return "ARTIST_PROFILE";
  if (path.includes("/artworks") || path.includes("/art/")) {
    if (path.includes("/artists/")) return "ARTIST_PROFILE";
    return "COLLECTION_OBJECT";
  }
  if (path.includes("/artists/") || path.includes("/agents/")) return "ARTIST_PROFILE";
  const exhibitionPath = path.split("/").filter(Boolean);
  if (path.includes("/exhibitions/") && exhibitionPath.length >= 2) return "EXHIBITION";
  if (path.includes("/whats-on/")) return exhibitionPath.length >= 3 ? "EXHIBITION" : "ARCHIVE_INDEX";
  if (path === "/" || path.endsWith("/exhibitions") || path.endsWith("/whats-on")) return "ARCHIVE_INDEX";
  return "UNKNOWN";
}

export function tateResultLinks(html: string): string[] {
  const links: string[] = [];
  for (const match of html.matchAll(/<div class="card card--cluster">[\s\S]{0,500}?<a href="([^"]+)"/g)) {
    const href = match[1].replace(/&amp;/g, "&").split("?")[0] ?? "";
    if (!href.startsWith("/") || href.startsWith("/whats-on?")) continue;
    links.push(`https://www.tate.org.uk${href}`);
  }
  return [...new Set(links)];
}

function rosterLabel(value: string): string | null {
  const name = clean(value).replace(/\s+Born\b.*$/i, "").trim();
  const parts = name.match(/^([^,]+),\s*(.+)$/);
  if (!parts) return null;
  const label = `${parts[1]} ${parts[2]}`.replace(/\s+/g, " ").trim();
  return label.length > 0 ? label : null;
}

export function tateExhibition(html: string): ExhibitionFields | null {
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? html.match(/property="og:title" content="([^"|]+)/i);
  const dateMatch = html.match(/splash-header__dates">([^<]+)</i);
  const venueMatch = html.match(/venue-block[\s\S]{0,400}?content-block__title">([^<]+)</i);
  const roster = [...html.matchAll(/<strong>\s*([^<]*?)\s+Born\b/gi)]
    .flatMap((match) => {
      const label = rosterLabel(match[1] ?? "");
      return label ? [label] : [];
    });
  const venue = venueMatch ? clean(venueMatch[1] ?? "") : null;
  if (!titleMatch && !dateMatch && roster.length === 0) return null;
  return {
    title: titleMatch ? clean(titleMatch[1] ?? "") : null,
    dateText: dateMatch ? clean(dateMatch[1] ?? "") : null,
    startDate: null,
    endDate: null,
    venue,
    city: venue && /\bliverpool\b/i.test(venue) ? "Liverpool"
      : venue && /\blondon\b|\btate modern\b|\btate britain\b/i.test(venue) ? "London"
        : venue && /\bst ives\b/i.test(venue) ? "St Ives"
          : null,
    roster,
    webUrl: null,
  };
}

export function clevelandHtmlExhibition(html: string): ExhibitionFields | null {
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const dateMatch = html.match(/<strong>\s*((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+[^<]+)<\/strong>/i);
  const venueMatch = html.match(/property="og:title" content="[^"|]+\|\s*([^"]+)"/i);
  if (!titleMatch || !dateMatch) return null;
  return {
    title: clean(titleMatch[1] ?? ""),
    dateText: clean(dateMatch[1] ?? ""),
    startDate: null,
    endDate: null,
    venue: venueMatch ? clean(venueMatch[1] ?? "") : null,
    city: /Cleveland,\s*OH\b/.test(html) ? "Cleveland" : null,
    roster: [],
    webUrl: null,
  };
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] ?? null : null;
}

export function clevelandExhibitions(json: unknown): ExhibitionFields[] {
  return rows(json).flatMap((row) => {
    if (typeof row.accession_number === "string" || Array.isArray(row.creators)) return [];
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const venues = Array.isArray(row.venues) ? row.venues.filter(record) : [];
    const venue = venues.map((item) => typeof item.name === "string" ? item.name.trim() : "").find(Boolean) ?? null;
    if (!title || !isoDate(row.opening_date)) return [];
    return [{
      title,
      dateText: null,
      startDate: isoDate(row.opening_date),
      endDate: isoDate(row.closing_date),
      venue,
      city: null,
      roster: [],
      webUrl: null,
    }];
  });
}

export function clevelandMatchedWorks(json: unknown, aliases: readonly string[]): { exhibitionIds: number[]; objectUrls: string[] } {
  const exhibitionIds: number[] = [];
  const objectUrls: string[] = [];
  for (const artwork of rows(json)) {
    const creators = Array.isArray(artwork.creators) ? artwork.creators.filter(record) : [];
    const matched = creators.some((creator) => {
      const original = typeof creator.name_in_original_language === "string" ? creator.name_in_original_language : "";
      const description = typeof creator.description === "string" ? creator.description.split(/[（(]/)[0]?.trim() ?? "" : "";
      return aliases.some((alias) => aliasLookupEqual(alias, original) || aliasLookupEqual(alias, description));
    });
    if (!matched) continue;
    if (typeof artwork.url === "string") objectUrls.push(artwork.url);
    const exhibitions = record(artwork.exhibitions);
    const current = exhibitions && Array.isArray(exhibitions.current) ? exhibitions.current.filter(record) : [];
    for (const show of current) {
      if (typeof show.id === "number") exhibitionIds.push(show.id);
    }
  }
  return { exhibitionIds: [...new Set(exhibitionIds)], objectUrls: [...new Set(objectUrls)] };
}

export function aicExactAgent(json: unknown, aliases: readonly string[]): { id: number; title: string } | null {
  const matched = rows(json).flatMap((row) => {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const id = typeof row.id === "number" ? row.id : null;
    if (!title || id == null || !aliases.some((alias) => aliasLookupEqual(alias, title))) return [];
    return [{ id, title }];
  });
  return matched.length === 1 ? matched[0] ?? null : null;
}

export function aicExhibition(json: unknown): ExhibitionFields | null {
  const body = record(json);
  const row = record(body?.data) ?? rows(json)[0];
  if (!row || row.api_model !== "exhibitions" || typeof row.title !== "string") return null;
  const webUrl = typeof row.web_url === "string" ? row.web_url : null;
  return {
    title: row.title.trim(),
    dateText: null,
    startDate: isoDate(row.aic_start_at),
    endDate: isoDate(row.aic_end_at),
    venue: null,
    city: null,
    roster: [],
    webUrl,
  };
}
