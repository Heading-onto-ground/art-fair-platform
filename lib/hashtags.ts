/**
 * Parse and normalize hashtags (#painting, #memory, etc.)
 */

const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;

export function normalizeHashtag(raw: string): string {
  return raw
    .replace(/^#+/, "")
    .trim()
    .toLowerCase()
    .slice(0, 64);
}

export function parseHashtags(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(HASHTAG_RE)) {
    const tag = normalizeHashtag(match[1] || "");
    if (tag.length >= 2) found.add(tag);
  }
  return Array.from(found);
}

export function captionWithoutHashtags(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(HASHTAG_RE, "").replace(/\s+/g, " ").trim();
}

export type HashtagSegment =
  | { type: "text"; value: string }
  | { type: "tag"; value: string };

/** Split caption into text and hashtag segments for rendering */
export function segmentCaption(text: string): HashtagSegment[] {
  if (!text) return [];
  const segments: HashtagSegment[] = [];
  let last = 0;
  const re = new RegExp(HASHTAG_RE.source, "gu");
  for (const match of text.matchAll(re)) {
    const idx = match.index ?? 0;
    if (idx > last) {
      segments.push({ type: "text", value: text.slice(last, idx) });
    }
    const tag = normalizeHashtag(match[1] || "");
    if (tag.length >= 2) {
      segments.push({ type: "tag", value: tag });
    } else {
      segments.push({ type: "text", value: match[0] });
    }
    last = idx + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }
  return segments;
}
