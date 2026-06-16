/** Heuristic series matching from artwork title/caption text. */

export function normalizeSeriesKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/#\s*\d+/g, "")
    .replace(/no\.?\s*\d+/gi, "")
    .replace(/part\s*\d+/gi, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTitleFromCaption(caption: string): string {
  const line = caption.split("\n")[0]?.trim() || "";
  return line.slice(0, 120);
}

export function seriesKeyFromText(title?: string | null, caption?: string | null): string | null {
  const combined = [title, caption].filter(Boolean).join(" ");
  const key = normalizeSeriesKey(combined);
  if (!key || key.length < 3) return null;
  return key;
}

export function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const aTokens = new Set(a.split(" ").filter((t) => t.length > 2));
  const bTokens = new Set(b.split(" ").filter((t) => t.length > 2));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

export type SeriesCandidate = { id: string; title: string };

export function findBestSeriesMatch(
  title: string | null | undefined,
  caption: string | null | undefined,
  seriesList: SeriesCandidate[],
  threshold = 0.55,
): SeriesCandidate | null {
  const artworkKey = seriesKeyFromText(title, caption);
  if (!artworkKey) return null;

  let best: SeriesCandidate | null = null;
  let bestScore = 0;

  for (const s of seriesList) {
    const seriesKey = normalizeSeriesKey(s.title);
    const score = similarityScore(artworkKey, seriesKey);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }

  return bestScore >= threshold ? best : null;
}

export function suggestSeriesTitle(title?: string | null, caption?: string | null): string | null {
  const raw = (title || extractTitleFromCaption(caption || "") || "").trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/#\s*\d+.*$/i, "")
    .replace(/no\.?\s*\d+.*$/i, "")
    .replace(/part\s*\d+.*$/i, "")
    .trim();

  if (cleaned.length < 3) return null;
  return cleaned.slice(0, 80);
}
