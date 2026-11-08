import { aliasLookupEqual, aliasLookupPrefix, normalizeArtistLookup } from "@/lib/history/identity";

export type SearchLabelRow = {
  canonicalName: string;
  nativeName: string | null;
  aliases: { label: string }[];
};

export function searchLabels(row: SearchLabelRow): string[] {
  return [row.canonicalName, row.nativeName, ...row.aliases.map((alias) => alias.label)].filter((label): label is string => Boolean(label));
}

/** A database probe that is a superset of exact and prefix identity. Final matching stays exact. */
export function searchProbe(rawQuery: string): string {
  const normalized = normalizeArtistLookup(rawQuery);
  const tokens = normalized.split(" ").filter((token) => token.length >= 2);
  return tokens.slice().sort((left, right) => right.length - left.length || left.localeCompare(right))[0] ?? normalized;
}

export function rankSearchRows<T extends SearchLabelRow>(rows: T[], rawQuery: string): T[] {
  const query = rawQuery.trim();
  if (!query) return [];
  return rows
    .map((row) => {
      const labels = searchLabels(row);
      const exact = labels.some((label) => aliasLookupEqual(label, query));
      const prefix = labels.some((label) => aliasLookupPrefix(query, label));
      return { row, exact, prefix };
    })
    .filter((item) => item.exact || item.prefix)
    .sort((left, right) => Number(right.exact) - Number(left.exact) || left.row.canonicalName.localeCompare(right.row.canonicalName))
    .slice(0, 8)
    .map((item) => item.row);
}

export type RecordedMentionInput = {
  label: string;
  exhibitionId: string;
  exhibitionSlug: string | null;
  title: string;
  artists: { slug: string; canonicalName: string; nativeName: string | null }[];
};

/** Exact identity only. A longer label is a different name, not a confirmed participant. */
export function rankRecordedMentions(rows: readonly RecordedMentionInput[], rawQuery: string): RecordedMentionInput[] {
  const query = rawQuery.trim();
  if (!query) return [];
  const ranked = rows
    .filter((row) => row.exhibitionSlug && aliasLookupEqual(row.label, query))
    .map((row) => ({ row }))
    .sort((left, right) => left.row.title.localeCompare(right.row.title));
  const seen = new Set<string>();
  const out: RecordedMentionInput[] = [];
  for (const item of ranked) {
    if (seen.has(item.row.exhibitionId)) continue;
    seen.add(item.row.exhibitionId);
    out.push(item.row);
    if (out.length === 8) break;
  }
  return out;
}
