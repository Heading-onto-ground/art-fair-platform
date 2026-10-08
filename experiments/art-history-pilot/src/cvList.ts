import { dateFromEvidence } from "./dates";

export type CvHit = {
  section: "solo" | "group";
  heading: string;
  year: string;
  title: string;
  venue: string;
  city: string | null;
  country: string | null;
  line: string;
};

const SOLO = /solo exhibitions|solo shows|개인전/i;
const GROUP = /group exhibitions|group shows|단체전/i;
const STOP = /awards|public collections|bibliography|selected press|^news\b|press$|education|수상|소장|보도|뉴스/i;
const JUNK = /participate in|participates in|\bpresents\b|\brepresent\b|subject of|awarded the|ranked on|unveils|">|&lt;|&gt;|https?:|courtesy|inquire|vogue|art in culture/i;
const INSTITUTION =
  /\b(?:museum|gallery|galerie|tate|kunsthalle|kunsthall|kunst|pavilion|biennale|center|centre|hall|palais|guggenheim|konsthall|leeum|foundation|institute)\b|미술관|갤러리|비엔날레|문화원|아트센터/i;

export function plainPage(html: string): string {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h1|h2|h3|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{2,}/g, "\n");
}

function decodeEntities(html: string): string {
  const named: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    rsquo: "'",
    lsquo: "'",
    rdquo: '"',
    ldquo: '"',
    ndash: "-",
    mdash: "-",
    eacute: "é",
    egrave: "è",
    agrave: "à",
    ouml: "ö",
    uuml: "ü",
    ntilde: "ñ",
    aacute: "á",
    oacute: "ó",
    uacute: "ú",
    iacute: "í",
    ccedil: "ç",
  };
  return html
    .replace(/&#(\d+);/g, (_, value) => String.fromCharCode(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCharCode(parseInt(value, 16)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => named[name.toLowerCase()] ?? whole);
}

function splitLine(line: string): { title: string; venue: string; city: string | null; country: string | null } | null {
  if (JUNK.test(line) || /presented in|works by/i.test(line)) return null;
  if (line.includes(" , ")) {
    const [rawTitle, rawRest] = line.split(" , ");
    const title = rawTitle?.trim() ?? "";
    const rest = (rawRest ?? "").split(",").map((part) => part.trim()).filter(Boolean);
    if (!title || rest.length === 0 || rest[0].length < 3) return null;
    const parsed = placeParts(title, rest);
    return parsed && venueOk(parsed.venue) ? parsed : null;
  }
  const bits = line.split(",").map((part) => part.trim()).filter(Boolean);
  if (bits.length < 2 || bits[0].length < 3) return null;
  const institutionAt = bits.findIndex((part) => venueOk(part));
  if (institutionAt < 0) return null;
  if (institutionAt === 0) return placeParts(bits[0], bits);
  return placeParts(bits.slice(0, institutionAt).join(", "), bits.slice(institutionAt));
}

function placeParts(
  title: string,
  rest: string[],
): { title: string; venue: string; city: string | null; country: string | null } | null {
  const venue = rest[0];
  if (!venue || venue.length < 3 || /[">]/.test(venue)) return null;
  const titled = title.includes(":") || title !== venue;
  const country = rest.length >= 3 ? rest[rest.length - 1] : null;
  const city = rest.length >= 3 ? rest.slice(1, -1).join(", ") : rest[1] ?? null;
  return {
    title: titled ? title : venue,
    venue: titled ? venue : venue,
    city,
    country,
  };
}

export function exhibitionsFromCv(pageText: string, artistNames: string[]): CvHit[] {
  const named = artistNames.filter((name) => name && pageText.includes(name));
  if (named.length === 0) return [];
  const hits: CvHit[] = [];
  let section: "solo" | "group" | null = null;
  let heading = "";
  let year: string | null = null;
  for (const raw of pageText.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (SOLO.test(line) && line.length < 80) {
      section = "solo";
      heading = line;
      year = null;
      continue;
    }
    if (GROUP.test(line) && line.length < 80) {
      section = "group";
      heading = line;
      year = null;
      continue;
    }
    if (STOP.test(line) && line.length < 80) {
      section = null;
      heading = "";
      year = null;
      continue;
    }
    if (/^(19|20)\d{2}$/.test(line)) {
      year = line;
      continue;
    }
    if (!section || !year || line.length > 180 || line.length < 8) continue;
    if (/born|lives and works|b\.\s*\d{4}/i.test(line)) continue;
    const parsed = splitLine(line);
    if (!parsed) continue;
    if (section === "group" && !named.some((name) => line.includes(name))) continue;
    hits.push({ section, heading, year, ...parsed, line });
  }
  return hits;
}

function venueOk(venue: string): boolean {
  return INSTITUTION.test(venue) && !venue.includes(":");
}

function isDateLine(line: string): boolean {
  return /(?:19|20)\d{2}/.test(line) && /월|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)/i.test(line);
}

function isRangeLine(line: string): boolean {
  return isDateLine(line) && /[~\-–—]/.test(line);
}

function isArtistOnly(title: string, artistNames: string[]): boolean {
  const compact = title.replace(/\s+/g, "").toLowerCase();
  return artistNames.some((name) => name.replace(/\s+/g, "").toLowerCase() === compact);
}

function isVenueLine(line: string): boolean {
  return (
    line.length >= 3 &&
    line.length < 120 &&
    !isDateLine(line) &&
    /museum|gallery|tate|kunst|pavilion|biennale|center|centre|hall|palais|guggenheim|konsthall|leeum/i.test(line)
  );
}

export function exhibitionsFromBlocks(pageText: string, artistNames: string[]): CvHit[] {
  const named = artistNames.filter((name) => name && pageText.includes(name));
  if (named.length === 0) return [];
  const lines = pageText.split("\n").map((line) => line.trim()).filter(Boolean);
  const hits: CvHit[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!isRangeLine(line)) continue;
    const prev = lines[index - 1] ?? "";
    const prev2 = lines[index - 2] ?? "";
    const next = lines[index + 1] ?? "";
    let title = "";
    let venue = "";
    let city: string | null = null;
    let country: string | null = null;
    if (isVenueLine(prev) && prev2 && !isDateLine(prev2)) {
      title = prev2;
      venue = prev;
      const place = line.split(/\d{1,2}월|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)[0] ?? "";
      const bits = place.split(",").map((part) => part.trim()).filter(Boolean);
      city = bits[0] ?? null;
      country = bits[1] ?? null;
    } else if (isVenueLine(next) && prev && !isDateLine(prev)) {
      title = prev;
      const bits = next.split(",").map((part) => part.trim()).filter(Boolean);
      venue = bits[0] ?? "";
      city = bits.length >= 3 ? bits.slice(1, -1).join(", ") : bits[1] ?? null;
      country = bits.length >= 3 ? bits[bits.length - 1] : null;
    } else {
      continue;
    }
    const window = [prev2, prev, line, next].join("\n");
    if (!named.some((name) => window.includes(name))) continue;
    if (JUNK.test(`${title} ${venue}`) || /issue/i.test(`${title} ${venue}`)) continue;
    if (!title || !venue || !venueOk(venue) || isArtistOnly(title, named)) continue;
    hits.push({
      section: /group exhibition/i.test(window) ? "group" : "solo",
      heading: "",
      year: line,
      title,
      venue,
      city,
      country,
      line,
    });
  }
  return hits;
}

export function exhibitionsFromCards(pageText: string, artistNames: string[]): CvHit[] {
  const named = artistNames.filter((name) => name && pageText.includes(name));
  if (named.length === 0) return [];
  const lines = pageText.split("\n").map((line) => line.trim()).filter(Boolean);
  const hits: CvHit[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const next = lines[index + 1] ?? "";
    if (line.length > 180 || JUNK.test(line)) continue;
    if (!named.some((name) => line.includes(name))) continue;
    const dated = dateFromEvidence(next);
    if (dated.status !== "ok" || !dated.end || next.length > 80) continue;
    const parsed = splitLine(line);
    if (!parsed || isArtistOnly(parsed.title, named)) continue;
    hits.push({ section: /group/i.test(line) ? "group" : "solo", heading: "", year: next, ...parsed, line });
  }
  return hits;
}

export function exhibitionFromSinglePage(pageText: string, artistNames: string[]): CvHit | null {
  const named = artistNames.filter((name) => name && pageText.includes(name));
  if (named.length === 0) return null;
  const lines = pageText.split("\n").map((line) => line.trim()).filter(Boolean);
  let found: CvHit | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const dated = dateFromEvidence(line);
    if (dated.status !== "ok" || !dated.end || line.length > 80) continue;
    const window = lines.slice(Math.max(0, index - 4), index + 5);
    const venue = window.find((item) => item !== line && venueOk(item) && item.length < 90 && !JUNK.test(item));
    const title = window.find(
      (item) =>
        item !== line &&
        item !== venue &&
        item.length < 110 &&
        !JUNK.test(item) &&
        named.some((name) => item.includes(name)),
    );
    if (!venue || !title) continue;
    if (found) return null;
    found = {
      section: "solo",
      heading: "",
      year: line,
      title,
      venue,
      city: null,
      country: null,
      line: title,
    };
  }
  return found;
}
