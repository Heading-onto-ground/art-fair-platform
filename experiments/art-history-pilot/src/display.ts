export const VISIBLE_PIPS = 4;
export const MOMENT_SATELLITE_LIMIT = 7;
export const JOURNEY_MS = 640;

export type ZoomLevel = "ALL" | "DECADE" | "YEAR";
export type DotMark = "filled" | "open";

export type YearGroup = {
  year: number;
  count: number;
  ids: string[];
  marks: DotMark[];
  visible: number;
  overflow: number;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
  auml: "ä",
  Auml: "Ä",
  ouml: "ö",
  Ouml: "Ö",
  uuml: "ü",
  Uuml: "Ü",
  aacute: "á",
  Aacute: "Á",
  eacute: "é",
  Eacute: "É",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  agrave: "à",
  egrave: "è",
  ecirc: "ê",
  acirc: "â",
  ucirc: "û",
  Ucirc: "Û",
  ocirc: "ô",
  ccedil: "ç",
  Ccedil: "Ç",
  ntilde: "ñ",
  szlig: "ß",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

const COUNTRY_ALIASES: Record<string, string> = {
  korea: "Korea",
  "south korea": "Korea",
  "republic of korea": "Korea",
  rok: "Korea",
  대한민국: "Korea",
  한국: "Korea",
};

export function decodeDisplayText(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (entity, body: string) => {
    if (body.startsWith("#")) {
      const code = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return entity;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[body] ?? entity;
  });
}

export function displayCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const decoded = decodeDisplayText(value).trim();
  if (!decoded) return null;
  return COUNTRY_ALIASES[decoded.toLowerCase()] ?? decoded;
}

export function compactPhrase(value: string): string {
  return decodeDisplayText(value).toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

export function phrasesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  const a = compactPhrase(left);
  const b = compactPhrase(right);
  return a.length > 0 && a === b;
}

export function uncertainDisplay(value: string | null | undefined): boolean {
  if (!value) return false;
  const decoded = decodeDisplayText(value);
  if (/&(?:#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/.test(decoded)) return true;
  return /\b[A-Za-z]{1,2}\d{4}\b/.test(decoded);
}

export function clusterFace(count: number, cap = VISIBLE_PIPS): { visible: number; overflow: number } {
  const safe = Math.max(0, count);
  const visible = Math.min(safe, cap);
  return { visible, overflow: safe - visible };
}

export function groupByYear(events: { id: string; year: number | null; mark: DotMark }[]): YearGroup[] {
  const map = new Map<number, { ids: string[]; marks: DotMark[] }>();
  for (const event of events) {
    if (event.year == null) continue;
    const current = map.get(event.year) ?? { ids: [], marks: [] };
    current.ids.push(event.id);
    current.marks.push(event.mark);
    map.set(event.year, current);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, group]) => {
      const face = clusterFace(group.ids.length);
      return { year, count: group.ids.length, ids: group.ids, marks: group.marks, ...face };
    });
}

export function careerSpan(groups: { year: number }[]): { first: number; last: number } | null {
  if (!groups.length) return null;
  return { first: groups[0].year, last: groups[groups.length - 1].year };
}

export function majorGaps(groups: { year: number }[], minimum = 3): { from: number; to: number }[] {
  const gaps: { from: number; to: number }[] = [];
  for (let index = 1; index < groups.length; index += 1) {
    const previous = groups[index - 1].year;
    const next = groups[index].year;
    if (next - previous > minimum) gaps.push({ from: previous + 1, to: next - 1 });
  }
  return gaps;
}

export function zoomSpan(
  level: ZoomLevel,
  focusYear: number | null,
  first: number,
  last: number,
): { start: number; end: number } {
  if (level === "DECADE") {
    const year = focusYear ?? last;
    const start = Math.floor(year / 10) * 10;
    return { start, end: start + 9 };
  }
  return { start: first, end: last };
}

export function signatureColumns(counts: number[], cap = 3): number[] {
  const max = Math.max(0, ...counts);
  if (max === 0) return counts.map(() => 0);
  return counts.map((count) => (count === 0 ? 0 : Math.max(1, Math.round((count / max) * cap))));
}

export function momentPlace(input: {
  title: string;
  venue: string | null;
  city: string | null;
  country: string | null;
}): { title: string; place: string | null; review: boolean } {
  const title = decodeDisplayText(input.title).trim();
  const venue = input.venue ? decodeDisplayText(input.venue).trim() : "";
  const city = input.city ? decodeDisplayText(input.city).trim() : "";
  const country = displayCountry(input.country) ?? "";
  const parts = [phrasesMatch(title, venue) ? "" : venue, city, country].filter(Boolean);
  const review = [input.title, input.venue, input.city, input.country].some((value) => uncertainDisplay(value));
  return { title, place: parts.length ? parts.join(" · ") : null, review };
}

export type MomentNode = { id: string; kind: "artist" | "space" | "curator"; label: string };

export function momentSatellites(
  input: {
    artists: MomentNode[];
    space: MomentNode | null;
    curators: MomentNode[];
  },
  expanded = false,
  limit = MOMENT_SATELLITE_LIMIT,
): { visible: MomentNode[]; hiddenArtists: number } {
  const reserve = (input.space ? 1 : 0) + (input.curators.length ? 1 : 0);
  const room = Math.max(0, limit - reserve);
  const artists = expanded ? input.artists : input.artists.slice(0, room);
  const visible = [...artists];
  if (input.space) visible.push(input.space);
  if (input.curators[0]) visible.push(input.curators[0]);
  return { visible: visible.slice(0, expanded ? visible.length : limit), hiddenArtists: Math.max(0, input.artists.length - artists.length) };
}

export function restoredArtistPath(input: {
  from: string;
  via: string | null;
  srcZoom: string | null;
  srcFocus: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.via) params.set("event", input.via);
  if (input.srcZoom) params.set("zoom", input.srcZoom);
  if (input.srcFocus) params.set("focus", input.srcFocus);
  const query = params.toString();
  return `/artist/${input.from}${query ? `?${query}` : ""}`;
}

export function journeyStops(from: string, via: string, to: string): [string, string, string] {
  return [from, via, to];
}

export function shouldPlayJourney(reduceMotion: boolean): boolean {
  return !reduceMotion;
}
