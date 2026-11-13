import { prisma } from "@/lib/prisma";
import { canonicalArtistPath, canonicalExhibitionPath, formatHistoryDate } from "@/lib/history/policy";
import { publicExhibitionWhere } from "@/lib/history/queries";
import {
  ALERT_PAGE_SIZE,
  ALERT_TYPE,
  RECONCILE_PARTICIPATION_CAP,
  RECONCILE_WINDOW_MS,
  alertKey,
  alertMessage,
  decodeAlertCursor,
  encodeAlertCursor,
  planActivityAlerts,
  type PlannedAlert,
} from "@/lib/pro/activityAlertPolicy";

export type AlertGenerationStats = {
  considered: number;
  watchersMatched: number;
  inserted: number;
  duplicatesSkipped: number;
  failures: number;
};

export type AlertListItem = {
  id: string;
  artistEntityId: string;
  artistSlug: string | null;
  artistName: string | null;
  exhibitionId: string | null;
  exhibitionTitle: string | null;
  spaceName: string | null;
  eventDateLabel: string | null;
  message: string;
  isHistoricalBackfill: boolean;
  recordedAt: string;
  createdAt: string;
  readAt: string | null;
  href: string | null;
};

const EMPTY_STATS: AlertGenerationStats = {
  considered: 0,
  watchersMatched: 0,
  inserted: 0,
  duplicatesSkipped: 0,
  failures: 0,
};

function logAlertStats(stats: AlertGenerationStats) {
  console.info(JSON.stringify({
    scope: "activity_alerts",
    considered: stats.considered,
    inserted: stats.inserted,
    duplicatesSkipped: stats.duplicatesSkipped,
    watchersMatched: stats.watchersMatched,
    failures: stats.failures,
  }));
}

function eventYearOf(meta: { endYear: number | null; startYear: number | null } | null): number | null {
  if (!meta) return null;
  return meta.endYear ?? meta.startYear;
}

async function insertPlanned(planned: PlannedAlert[], existingCount: number): Promise<AlertGenerationStats> {
  if (planned.length === 0) {
    return { ...EMPTY_STATS, duplicatesSkipped: existingCount };
  }
  const created = await prisma.activityAlert.createMany({
    data: planned.map((row) => ({
      userId: row.userId,
      artistEntityId: row.artistEntityId,
      exhibitionId: row.exhibitionId,
      type: row.type,
      eventYear: row.eventYear,
      isHistoricalBackfill: row.isHistoricalBackfill,
      recordedAt: row.recordedAt,
    })),
    skipDuplicates: true,
  });
  return {
    considered: 0,
    watchersMatched: 0,
    inserted: created.count,
    duplicatesSkipped: existingCount + planned.length - created.count,
    failures: 0,
  };
}

async function generateForExhibition(exhibitionId: string, artistEntityIds: string[]): Promise<AlertGenerationStats> {
  const ids = [...new Set(artistEntityIds.map((id) => id.trim()).filter((id) => id.length > 0))];
  if (!exhibitionId || ids.length === 0) return EMPTY_STATS;
  const exhibition = await prisma.exhibition.findFirst({
    where: { id: exhibitionId, AND: [publicExhibitionWhere] },
    select: {
      id: true,
      historyMeta: { select: { startYear: true, endYear: true } },
    },
  });
  if (!exhibition) return EMPTY_STATS;
  const participations: Array<{ artistEntityId: string; createdAt: Date }> = await prisma.historyParticipation.findMany({
    where: { exhibitionId, artistEntityId: { in: ids } },
    select: { artistEntityId: true, createdAt: true },
  });
  if (participations.length === 0) return EMPTY_STATS;
  const watches: Array<{ userId: string; artistEntityId: string; createdAt: Date }> = await prisma.artistWatch.findMany({
    where: { artistEntityId: { in: participations.map((row) => row.artistEntityId) } },
    select: { userId: true, artistEntityId: true, createdAt: true },
  });
  const eventYear = eventYearOf(exhibition.historyMeta);
  const facts = participations.map((row) => ({
    exhibitionId,
    artistEntityId: row.artistEntityId,
    recordedAt: row.createdAt,
    eventYear,
    isPublic: true,
  }));
  const eligible = planActivityAlerts({ participations: facts, watches });
  const watchersMatched = eligible.length;
  if (eligible.length === 0) {
    return { ...EMPTY_STATS, considered: participations.length, watchersMatched: 0 };
  }
  const existing: Array<{ userId: string; artistEntityId: string; exhibitionId: string; type: string }> = await prisma.activityAlert.findMany({
    where: {
      type: ALERT_TYPE,
      OR: eligible.map((row) => ({
        userId: row.userId,
        artistEntityId: row.artistEntityId,
        exhibitionId: row.exhibitionId,
      })),
    },
    select: { userId: true, artistEntityId: true, exhibitionId: true, type: true },
  });
  const existingKeys = new Set(existing.map((row) => alertKey(row)));
  const planned = planActivityAlerts({ participations: facts, watches, existingKeys });
  const inserted = await insertPlanned(planned, eligible.length - planned.length);
  return {
    ...inserted,
    considered: participations.length,
    watchersMatched,
  };
}

/**
 * Publication boundary for in-app alerts.
 * Research publication and claimed first-party submission both call this after the public
 * participation is committed. Alert failure is counted and does not throw, so the public
 * exhibition write is left in place. Draft, pending, rejected, and unresolved names never
 * reach this with a public exhibition row.
 * Reconciliation is a bounded retry of participations recorded in the last 48 hours.
 * It is not scheduled and it does not scan older history.
 */
export async function recordPublicParticipationAlerts(input: {
  exhibitionId: string;
  artistEntityIds: string[];
}): Promise<AlertGenerationStats> {
  try {
    const stats = await generateForExhibition(input.exhibitionId, input.artistEntityIds);
    logAlertStats(stats);
    return stats;
  } catch {
    const stats = { ...EMPTY_STATS, failures: 1 };
    logAlertStats(stats);
    return stats;
  }
}

export async function reconcileRecentActivityAlerts(now = new Date()): Promise<AlertGenerationStats> {
  try {
    const since = new Date(now.getTime() - RECONCILE_WINDOW_MS);
    const rows = await prisma.historyParticipation.findMany({
      where: {
        createdAt: { gt: since, lte: now },
        exhibition: publicExhibitionWhere,
      },
      orderBy: { createdAt: "asc" },
      take: RECONCILE_PARTICIPATION_CAP,
      select: { exhibitionId: true, artistEntityId: true },
    });
    const grouped = new Map<string, string[]>();
    for (const row of rows) {
      const list = grouped.get(row.exhibitionId) ?? [];
      list.push(row.artistEntityId);
      grouped.set(row.exhibitionId, list);
    }
    const totals = { ...EMPTY_STATS };
    for (const [exhibitionId, artistEntityIds] of grouped) {
      const stats = await generateForExhibition(exhibitionId, artistEntityIds);
      totals.considered += stats.considered;
      totals.watchersMatched += stats.watchersMatched;
      totals.inserted += stats.inserted;
      totals.duplicatesSkipped += stats.duplicatesSkipped;
      totals.failures += stats.failures;
    }
    logAlertStats(totals);
    return totals;
  } catch {
    const stats = { ...EMPTY_STATS, failures: 1 };
    logAlertStats(stats);
    return stats;
  }
}

export async function countUnreadAlerts(userId: string): Promise<number> {
  return prisma.activityAlert.count({ where: { userId, readAt: null } });
}

export async function listActivityAlerts(
  userId: string,
  cursor: string | null,
  unreadOnly: boolean,
): Promise<{ ok: true; items: AlertListItem[]; nextCursor: string | null; unreadCount: number } | { ok: false; error: "invalid_cursor" }> {
  const position = cursor ? decodeAlertCursor(cursor) : null;
  if (cursor && !position) return { ok: false, error: "invalid_cursor" };
  const rows: Array<{
    id: string;
    userId: string;
    artistEntityId: string;
    exhibitionId: string;
    eventYear: number | null;
    isHistoricalBackfill: boolean;
    recordedAt: Date;
    readAt: Date | null;
    createdAt: Date;
  }> = await prisma.activityAlert.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
      ...(position
        ? {
            OR: [
              { createdAt: { lt: position.createdAt } },
              { createdAt: position.createdAt, id: { lt: position.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: ALERT_PAGE_SIZE + 1,
  });
  const page = rows.slice(0, ALERT_PAGE_SIZE);
  const exhibitionIds = [...new Set(page.map((row) => row.exhibitionId))];
  const artistIds = [...new Set(page.map((row) => row.artistEntityId))];
  const [exhibitions, artists, unreadCount]: [
    Array<{
      id: string;
      title: string;
      space: { name: string } | null;
      historyMeta: { slug: string | null; datePrecision: string; startYear: number | null; startMonth: number | null; startDay: number | null } | null;
    }>,
    Array<{ id: string; slug: string; canonicalName: string }>,
    number,
  ] = await Promise.all([
    exhibitionIds.length === 0
      ? Promise.resolve([])
      : prisma.exhibition.findMany({
          where: { id: { in: exhibitionIds }, AND: [publicExhibitionWhere] },
          select: {
            id: true,
            title: true,
            space: { select: { name: true } },
            historyMeta: {
              select: { slug: true, datePrecision: true, startYear: true, startMonth: true, startDay: true },
            },
          },
        }),
    artistIds.length === 0
      ? Promise.resolve([])
      : prisma.artistEntity.findMany({
          where: { id: { in: artistIds } },
          select: { id: true, slug: true, canonicalName: true },
        }),
    countUnreadAlerts(userId),
  ]);
  const exhibitionById = new Map(exhibitions.map((row) => [row.id, row]));
  const artistById = new Map(artists.map((row) => [row.id, row]));
  const items = page.map((row) => {
    const exhibition = exhibitionById.get(row.exhibitionId) ?? null;
    const artist = artistById.get(row.artistEntityId) ?? null;
    const slug = exhibition?.historyMeta?.slug ?? null;
    const artistSlug = artist?.slug ?? null;
    return {
      id: row.id,
      artistEntityId: row.artistEntityId,
      artistSlug,
      artistName: artist?.canonicalName ?? null,
      exhibitionId: exhibition ? exhibition.id : null,
      exhibitionTitle: exhibition?.title ?? null,
      spaceName: exhibition?.space?.name ?? null,
      eventDateLabel: exhibition?.historyMeta
        ? formatHistoryDate({
            precision: exhibition.historyMeta.datePrecision,
            year: exhibition.historyMeta.startYear,
            month: exhibition.historyMeta.startMonth,
            day: exhibition.historyMeta.startDay,
          })
        : null,
      message: alertMessage({ isHistoricalBackfill: row.isHistoricalBackfill, eventYear: row.eventYear }),
      isHistoricalBackfill: row.isHistoricalBackfill,
      recordedAt: row.recordedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt ? row.readAt.toISOString() : null,
      href: slug ? canonicalExhibitionPath(slug) : artistSlug ? canonicalArtistPath(artistSlug) : null,
    };
  });
  const last = page[page.length - 1];
  const nextCursor = rows.length > ALERT_PAGE_SIZE && last ? encodeAlertCursor(last.createdAt, last.id) : null;
  return { ok: true, items, nextCursor, unreadCount };
}

export async function markAlertRead(userId: string, alertId: string, now = new Date()): Promise<{ readAt: Date } | null> {
  const row = await prisma.activityAlert.findFirst({
    where: { id: alertId, userId },
    select: { id: true, readAt: true },
  });
  if (!row) return null;
  if (row.readAt) return { readAt: row.readAt };
  const updated = await prisma.activityAlert.updateMany({
    where: { id: row.id, userId, readAt: null },
    data: { readAt: now },
  });
  if (updated.count === 0) {
    const again = await prisma.activityAlert.findFirst({
      where: { id: alertId, userId },
      select: { readAt: true },
    });
    return again?.readAt ? { readAt: again.readAt } : { readAt: now };
  }
  return { readAt: now };
}

export async function markAllAlertsRead(userId: string, now = new Date()): Promise<number> {
  const result = await prisma.activityAlert.updateMany({
    where: { userId, readAt: null },
    data: { readAt: now },
  });
  return result.count;
}
