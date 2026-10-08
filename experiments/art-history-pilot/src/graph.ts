import type { ExhibitionRecord } from "./claims";
import { isRecordedExhibition } from "./claims";

export const EARLIEST_LABEL = "Earliest recorded exhibition";

export type GraphEdge = {
  type: "PARTICIPATED_IN" | "HELD_AT" | "CURATED_BY";
  from: string;
  to: string;
  exhibitionId: string;
  sourceUrl: string;
};

export function materializeGraph(records: ExhibitionRecord[]): { edges: GraphEdge[] } {
  const edges: GraphEdge[] = [];
  for (const record of records) {
    if (!isRecordedExhibition(record)) continue;
    for (const artist of record.artistNames) {
      edges.push({
        type: "PARTICIPATED_IN",
        from: artist,
        to: record.id,
        exhibitionId: record.id,
        sourceUrl: record.sourceUrl,
      });
    }
    if (record.venueName) {
      edges.push({
        type: "HELD_AT",
        from: record.id,
        to: record.venueName,
        exhibitionId: record.id,
        sourceUrl: record.sourceUrl,
      });
    }
    for (const curator of record.curatorNames) {
      edges.push({
        type: "CURATED_BY",
        from: record.id,
        to: curator,
        exhibitionId: record.id,
        sourceUrl: record.sourceUrl,
      });
    }
  }
  return { edges };
}

export function sharedExhibitionIds(records: ExhibitionRecord[], left: string, right: string): string[] {
  return records
    .filter(
      (record) =>
        isRecordedExhibition(record) &&
        record.artistNames.includes(left) &&
        record.artistNames.includes(right),
    )
    .map((record) => record.id);
}

function sortKey(record: ExhibitionRecord): string {
  return record.start?.value ?? "9999";
}

export function earliestRecordedExhibition(
  records: ExhibitionRecord[],
  artistName: string,
): { label: typeof EARLIEST_LABEL; record: ExhibitionRecord } | null {
  const accepted = records
    .filter((record) => isRecordedExhibition(record) && record.artistNames.includes(artistName) && record.start)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const record = accepted[0];
  if (!record) return null;
  return { label: EARLIEST_LABEL, record };
}
