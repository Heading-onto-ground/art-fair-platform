import type { HistoryLocale } from "@/lib/history/locale";

export type PublicArtworkRecord = {
  id: string;
  seriesId: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  inPortfolio: boolean;
};

/** Works the artist chose for the public portfolio. Public and portfolio are separate choices. */
export function portfolioArtworks<T extends { isPublic: boolean; inPortfolio: boolean }>(works: T[]): T[] {
  return works.filter((work): work is T => work.isPublic && work.inPortfolio);
}

/**
 * Series cover uses a linked public image.
 * A portfolio work is preferred when the artist selected one.
 * A public work that is not in the portfolio can still illustrate its series
 * without being added to the portfolio.
 */
export function publicArtworkImagePath(id: string): string {
  return `/api/public-artwork/${encodeURIComponent(id)}/image`;
}

export function seriesCoverArtworkId(
  seriesId: string,
  works: Array<{ id: string; seriesId: string | null; isPublic: boolean; inPortfolio: boolean; hasImage: boolean }>,
): string | null {
  const linked = works.filter((work) => work.seriesId === seriesId && work.isPublic && work.hasImage);
  return (linked.find((work) => work.inPortfolio) ?? linked[0])?.id ?? null;
}

export function seriesCoverImage(seriesId: string, works: PublicArtworkRecord[]): string | null {
  const linked = works.filter(
    (work) => work.seriesId === seriesId && work.isPublic && Boolean(work.imageUrl),
  );
  const selected = linked.find((work) => work.inPortfolio);
  return (selected ?? linked[0])?.imageUrl ?? null;
}

const ENGLISH_COUNTRY: Record<string, string> = {
  한국: "South Korea",
  대한민국: "South Korea",
  korea: "South Korea",
  "south korea": "South Korea",
  kr: "South Korea",
};

export function displayCountry(value: string | null | undefined, locale: HistoryLocale): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (locale === "ko") return raw;
  return ENGLISH_COUNTRY[raw.toLowerCase()] ?? ENGLISH_COUNTRY[raw] ?? raw;
}

export function displayCity(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (!/^[a-z][a-z\s.'-]*$/i.test(raw)) return raw;
  return raw.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function practiceLine(input: {
  city?: string | null;
  country?: string | null;
  startedYear?: number | null;
  locale: HistoryLocale;
}): string | null {
  const where = [displayCity(input.city), displayCountry(input.country, input.locale)]
    .filter(Boolean)
    .join(", ");
  const since =
    typeof input.startedYear === "number"
      ? input.locale === "ko"
        ? `${input.startedYear}년부터`
        : `Since ${input.startedYear}`
      : null;
  const line = [where, since].filter(Boolean).join(" · ");
  return line || null;
}
