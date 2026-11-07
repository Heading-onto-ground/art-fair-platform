import { compactPhrase } from "@/lib/history/display";
import type { HistoryLocale } from "@/lib/history/locale";

const HANGUL = /[가-힣]/;

export type ArtistNameFields = {
  canonicalName: string;
  nativeName?: string | null;
};

export type ArtistDisplayNames = {
  primary: string;
  secondary: string | null;
};

function trimmed(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/** A native name is a Korean primary only when it actually contains Hangul. */
export function meaningfulHangulName(value: string | null | undefined): string | null {
  const name = trimmed(value);
  return name && HANGUL.test(name) ? name : null;
}

function differs(left: string, right: string): boolean {
  const a = compactPhrase(left);
  const b = compactPhrase(right);
  if (a && b) return a !== b;
  return left.trim().toLowerCase() !== right.trim().toLowerCase();
}

/**
 * Visible artist name for the current history locale.
 * Korean prefers a Hangul nativeName. English keeps the canonical name.
 * The other name is secondary only when it is present and not the same name.
 */
export function artistDisplayNames(input: ArtistNameFields & { locale: HistoryLocale }): ArtistDisplayNames {
  const canonical = trimmed(input.canonicalName);
  const native = trimmed(input.nativeName);
  const hangul = meaningfulHangulName(native);
  const primary = (input.locale === "ko" && hangul ? hangul : canonical) || native;
  const secondarySource = hangul && primary === hangul ? canonical : native;
  const secondary = secondarySource && differs(secondarySource, primary) ? secondarySource : null;
  return { primary, secondary };
}

export function artistDisplayName(input: ArtistNameFields & { locale: HistoryLocale }): string {
  return artistDisplayNames(input).primary;
}

export function artistSecondaryName(input: ArtistNameFields & { locale: HistoryLocale }): string | null {
  return artistDisplayNames(input).secondary;
}

export function peopleDisplayNames(
  people: readonly { name: string; nativeName?: string | null }[],
  locale: HistoryLocale,
): string[] {
  return people.map((person) => artistDisplayName({ canonicalName: person.name, nativeName: person.nativeName, locale }));
}

/**
 * Resolve a journey or back-trail label from a loaded artist record.
 * Returns null when the record is missing so a slug is never title-cased into a public name.
 */
export function lookupArtistName(
  slug: string | null | undefined,
  records: readonly { slug?: string | null; canonicalName?: string | null; name?: string | null; nativeName?: string | null }[],
): ArtistNameFields | null {
  if (!slug) return null;
  const found = records.find((record) => record.slug === slug);
  const canonicalName = trimmed(found?.canonicalName || found?.name);
  if (!found || !canonicalName) return null;
  return { canonicalName, nativeName: trimmed(found.nativeName) || null };
}
