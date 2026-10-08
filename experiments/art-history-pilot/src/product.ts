import type { ExhibitionRecord } from "./claims";
import { isRecordedExhibition } from "./claims";
import { compactName } from "./resolve";

export type SeoBucket = "EMPTY" | "LOW_DENSITY" | "HISTORY_READY" | "RICH_HISTORY";

export function seoBucket(acceptedCount: number): SeoBucket {
  if (acceptedCount <= 0) return "EMPTY";
  if (acceptedCount < 8) return "LOW_DENSITY";
  if (acceptedCount < 30) return "HISTORY_READY";
  return "RICH_HISTORY";
}

export function exhibitionKey(title: string, venue: string | null, start: string | null): string {
  return `${compactName(title)}|${compactName(venue ?? "")}|${(start ?? "").slice(0, 4)}`;
}

export function sameCanonicalExhibition(left: ExhibitionRecord, right: ExhibitionRecord): boolean {
  if (!isRecordedExhibition(left) || !isRecordedExhibition(right)) return false;
  if (exhibitionKey(left.title, left.venueName, left.start?.value ?? null) !== exhibitionKey(right.title, right.venueName, right.start?.value ?? null)) return false;
  if ((left.start?.value ?? "") !== (right.start?.value ?? "")) return false;
  if ((left.end?.value ?? "") !== (right.end?.value ?? "")) return false;
  if (compactName(left.title) === compactName(left.venueName ?? "")) return false;
  if (left.title.trim().length < 24) return false;
  const names = (record: ExhibitionRecord) => [...new Set(record.artistNames.map((name) => compactName(name)))].sort().join("|");
  const leftNames = names(left);
  return leftNames.length > 0 && leftNames === names(right);
}

export function historySignature(values: string[], bins = 16): number[] {
  const years = values.map((value) => Number(value.slice(0, 4))).filter((year) => year >= 1800 && year <= 2100);
  const counts = Array.from({ length: bins }, () => 0);
  if (years.length === 0) return counts;
  const min = Math.min(...years);
  const span = Math.max(1, Math.max(...years) - min + 1);
  for (const year of years) {
    const index = Math.min(bins - 1, Math.floor(((year - min) / span) * bins));
    counts[index] += 1;
  }
  return counts;
}

export function timelineFraction(
  value: string,
  precision: string,
  minYear: number,
  maxYear: number,
): { fraction: number; precise: boolean } {
  const year = Number(value.slice(0, 4));
  const span = Math.max(1, maxYear - minYear + 1);
  if (precision === "year" || value.length === 4) {
    return { fraction: (year - minYear) / span, precise: false };
  }
  const month = Number(value.slice(5, 7));
  const monthIndex = Number.isFinite(month) && month >= 1 && month <= 12 ? month - 1 : 0;
  const day = precision === "day" ? Number(value.slice(8, 10)) : 0;
  const dayOffset = Number.isFinite(day) && day >= 1 ? (day - 1) / 31 : 0.5;
  return { fraction: (year - minYear + (monthIndex + dayOffset) / 12) / span, precise: precision === "day" };
}

export function incidenceCount(records: ExhibitionRecord[], names: Set<string>): number {
  return records.filter(isRecordedExhibition).reduce((sum, record) => {
    return sum + record.artistNames.filter((name) => names.has(name)).length;
  }, 0);
}
