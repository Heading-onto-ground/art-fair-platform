import { DISCOVERY_PAGE_SIZE } from "@/lib/pro/discoveryPolicy";

/** The only alert type in V1. Copy differences use stored facts, not more types. */
export const ALERT_TYPE = "EXHIBITION_RECORDED";
export const ALERT_PAGE_SIZE = DISCOVERY_PAGE_SIZE;
/** Retry window for a publication that already succeeded. Not a scheduled scan. */
export const RECONCILE_WINDOW_MS = 48 * 60 * 60 * 1000;
export const RECONCILE_PARTICIPATION_CAP = 200;

export const CURRENT_ACTIVITY_MESSAGE = "이 작가의 새로운 전시 활동이 확인되었습니다.";

export const ALERT_ITEM_KEYS = [
  "id",
  "artistEntityId",
  "artistSlug",
  "artistName",
  "exhibitionId",
  "exhibitionTitle",
  "spaceName",
  "eventDateLabel",
  "message",
  "isHistoricalBackfill",
  "recordedAt",
  "createdAt",
  "readAt",
  "href",
] as const;

export type AlertItemKey = (typeof ALERT_ITEM_KEYS)[number];

export type AlertParticipation = {
  exhibitionId: string;
  artistEntityId: string;
  recordedAt: Date;
  eventYear: number | null;
  isPublic: boolean;
};

export type AlertWatch = {
  userId: string;
  artistEntityId: string;
  createdAt: Date;
};

export type PlannedAlert = {
  userId: string;
  artistEntityId: string;
  exhibitionId: string;
  type: typeof ALERT_TYPE;
  eventYear: number | null;
  isHistoricalBackfill: boolean;
  recordedAt: Date;
};

/**
 * Historical when the factual event year is before the UTC year in which ROB recorded the participation.
 * A 1998 exhibition recorded in 2026 is a backfill. An exhibition in the recording year is current.
 * A missing year stays on the current template, which does not claim the exhibition is open now.
 * The flag is stored at generation time so a later calendar year does not rewrite old copy.
 */
export function isHistoricalRecord(eventYear: number | null, recordedAt: Date): boolean {
  if (eventYear == null || !Number.isInteger(eventYear)) return false;
  return eventYear < recordedAt.getUTCFullYear();
}

export function alertMessage(input: { isHistoricalBackfill: boolean; eventYear: number | null }): string {
  if (input.isHistoricalBackfill && input.eventYear != null) {
    return `ROB에 ${input.eventYear}년 전시 기록이 새로 추가되었습니다.`;
  }
  return CURRENT_ACTIVITY_MESSAGE;
}

export function alertKey(input: { userId: string; artistEntityId: string; exhibitionId: string; type: string }): string {
  return `${input.userId}\n${input.artistEntityId}\n${input.exhibitionId}\n${input.type}`;
}

export function planActivityAlerts(input: {
  participations: AlertParticipation[];
  watches: AlertWatch[];
  existingKeys?: ReadonlySet<string>;
}): PlannedAlert[] {
  const seen = new Set(input.existingKeys ?? []);
  const planned: PlannedAlert[] = [];
  for (const participation of input.participations) {
    if (!participation.isPublic) continue;
    for (const watch of input.watches) {
      if (watch.artistEntityId !== participation.artistEntityId) continue;
      if (watch.createdAt.getTime() >= participation.recordedAt.getTime()) continue;
      const key = alertKey({
        userId: watch.userId,
        artistEntityId: participation.artistEntityId,
        exhibitionId: participation.exhibitionId,
        type: ALERT_TYPE,
      });
      if (seen.has(key)) continue;
      seen.add(key);
      planned.push({
        userId: watch.userId,
        artistEntityId: participation.artistEntityId,
        exhibitionId: participation.exhibitionId,
        type: ALERT_TYPE,
        eventYear: participation.eventYear,
        isHistoricalBackfill: isHistoricalRecord(participation.eventYear, participation.recordedAt),
        recordedAt: participation.recordedAt,
      });
    }
  }
  return planned;
}

export function encodeAlertCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ c: createdAt.toISOString(), i: id }), "utf8").toString("base64url");
}

export function decodeAlertCursor(value: string): { createdAt: Date; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { c?: unknown; i?: unknown };
    if (!parsed || typeof parsed.c !== "string" || typeof parsed.i !== "string" || !parsed.i.trim()) return null;
    const createdAt = new Date(parsed.c);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id: parsed.i };
  } catch {
    return null;
  }
}

export function parseObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function hasUnknownField(record: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(record).some((key) => !allowed.includes(key));
}
