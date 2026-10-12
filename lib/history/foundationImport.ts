import { resolveVerifiedAlias } from "@/lib/history/identity";

export type FoundationCandidate = {
  pilotRecordId: string;
  title: string;
  year: number;
  venue: string;
  city: string;
  country: string;
  participants: string[];
  unresolved: string[];
  sourceUrl: string;
};

export function normName(value: string): string {
  return value.trim().toLowerCase();
}

export function matchKnownArtist(label: string): string | null {
  return resolveVerifiedAlias(label);
}

export function termsBlockFactualMetadata(text: string): boolean {
  const folded = text.toLowerCase();
  const bans = [
    "do not reproduce",
    "reproduction of the text",
    "no scraping",
    "automated collection is prohibited",
    "데이터베이스를 복제",
    "자동으로 수집",
    "스크래핑",
  ];
  return bans.some((phrase) => folded.includes(phrase) || text.includes(phrase));
}

const PRODUCTION_DUPLICATES = [
  { year: 2025, venue: "tina kim" },
  { year: 1994, venue: "gallery 63" },
  { year: 1992, venue: "ingong" },
];

export function isProductionDuplicate(candidate: Pick<FoundationCandidate, "year" | "venue">): boolean {
  const venue = normName(candidate.venue);
  return PRODUCTION_DUPLICATES.some((row) => row.year === candidate.year && venue.includes(row.venue));
}

export function classifyParticipants(labels: string[]): { matched: string[]; unresolved: string[] } {
  const matched: string[] = [];
  const unresolved: string[] = [];
  for (const label of labels) {
    const key = matchKnownArtist(label);
    if (key && !matched.includes(key)) matched.push(key);
    else if (!key) unresolved.push(label);
  }
  return { matched, unresolved };
}
