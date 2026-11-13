import { beforeEach, describe, expect, it, vi } from "vitest";

const { findExhibition, findParticipations, findWatches, findExisting, createMany } = vi.hoisted(() => ({
  findExhibition: vi.fn(),
  findParticipations: vi.fn(),
  findWatches: vi.fn(),
  findExisting: vi.fn(),
  createMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exhibition: { findFirst: (...args: unknown[]) => findExhibition(...args), findMany: vi.fn() },
    historyParticipation: { findMany: (...args: unknown[]) => findParticipations(...args) },
    artistWatch: { findMany: (...args: unknown[]) => findWatches(...args) },
    artistEntity: { findMany: vi.fn() },
    activityAlert: {
      findMany: (...args: unknown[]) => findExisting(...args),
      findFirst: vi.fn(),
      createMany: (...args: unknown[]) => createMany(...args),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { recordPublicParticipationAlerts } from "@/lib/pro/activityAlertStore";

const recorded = new Date(Date.UTC(2026, 10, 15));
const watched = new Date(Date.UTC(2026, 10, 13));

describe("public participation alert generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findExisting.mockResolvedValue([]);
    createMany.mockResolvedValue({ count: 1 });
  });

  it("stores a historical alert for a 1998 exhibition recorded after the watch", async () => {
    findExhibition.mockResolvedValue({ id: "exhibition-1998", historyMeta: { startYear: 1998, endYear: null } });
    findParticipations.mockResolvedValue([{ artistEntityId: "artist-a", createdAt: recorded }]);
    findWatches.mockResolvedValue([{ userId: "user-a", artistEntityId: "artist-a", createdAt: watched }]);
    const stats = await recordPublicParticipationAlerts({ exhibitionId: "exhibition-1998", artistEntityIds: ["artist-a"] });
    expect(stats.inserted).toBe(1);
    expect(stats.failures).toBe(0);
    const data = createMany.mock.calls[0]?.[0].data;
    expect(data).toEqual([
      expect.objectContaining({
        userId: "user-a",
        artistEntityId: "artist-a",
        exhibitionId: "exhibition-1998",
        type: "EXHIBITION_RECORDED",
        eventYear: 1998,
        isHistoricalBackfill: true,
        recordedAt: recorded,
      }),
    ]);
  });

  it("stores current copy for an exhibition in the recording year and skips a second insert", async () => {
    findExhibition.mockResolvedValue({ id: "exhibition-now", historyMeta: { startYear: 2026, endYear: null } });
    findParticipations.mockResolvedValue([{ artistEntityId: "artist-a", createdAt: recorded }]);
    findWatches.mockResolvedValue([
      { userId: "user-a", artistEntityId: "artist-a", createdAt: watched },
      { userId: "user-b", artistEntityId: "artist-a", createdAt: watched },
    ]);
    createMany.mockResolvedValue({ count: 2 });
    const first = await recordPublicParticipationAlerts({ exhibitionId: "exhibition-now", artistEntityIds: ["artist-a"] });
    expect(first.inserted).toBe(2);
    expect(createMany.mock.calls[0]?.[0].data.every((row: { isHistoricalBackfill: boolean }) => row.isHistoricalBackfill === false)).toBe(true);
    findExisting.mockResolvedValue([
      { userId: "user-a", artistEntityId: "artist-a", exhibitionId: "exhibition-now", type: "EXHIBITION_RECORDED" },
      { userId: "user-b", artistEntityId: "artist-a", exhibitionId: "exhibition-now", type: "EXHIBITION_RECORDED" },
    ]);
    const second = await recordPublicParticipationAlerts({ exhibitionId: "exhibition-now", artistEntityIds: ["artist-a"] });
    expect(second.inserted).toBe(0);
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it("does not alert for a draft or for a participation recorded before the watch", async () => {
    findExhibition.mockResolvedValue(null);
    const draft = await recordPublicParticipationAlerts({ exhibitionId: "draft", artistEntityIds: ["artist-a"] });
    expect(draft.inserted).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
    findExhibition.mockResolvedValue({ id: "old", historyMeta: { startYear: 2001, endYear: null } });
    findParticipations.mockResolvedValue([{ artistEntityId: "artist-a", createdAt: new Date(Date.UTC(2020, 0, 1)) }]);
    findWatches.mockResolvedValue([{ userId: "user-a", artistEntityId: "artist-a", createdAt: watched }]);
    const old = await recordPublicParticipationAlerts({ exhibitionId: "old", artistEntityIds: ["artist-a"] });
    expect(old.inserted).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("counts a generation failure without throwing", async () => {
    findExhibition.mockRejectedValue(new Error("database"));
    await expect(recordPublicParticipationAlerts({ exhibitionId: "exhibition-now", artistEntityIds: ["artist-a"] })).resolves.toMatchObject({ failures: 1, inserted: 0 });
  });
});
