import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { isHistoryEvent } from "@/lib/history/policy";
import {
  ALERT_PAGE_SIZE,
  ALERT_TYPE,
  CURRENT_ACTIVITY_MESSAGE,
  alertMessage,
  planActivityAlerts,
  type AlertParticipation,
  type AlertWatch,
} from "@/lib/pro/activityAlertPolicy";

const requireUserSession = vi.fn();
const enforceRateLimit = vi.fn();
const listActivityAlerts = vi.fn();
const markAlertRead = vi.fn();
const markAllAlertsRead = vi.fn();

vi.mock("@/lib/apiGuards", () => ({
  requireUserSession: () => requireUserSession(),
  enforceRateLimit: (...args: unknown[]) => enforceRateLimit(...args),
}));

vi.mock("@/lib/pro/discoveryFlag", () => ({
  isProDiscoveryEnabled: () => (globalThis as { __proFlag?: boolean }).__proFlag === true,
}));

vi.mock("@/lib/pro/activityAlertStore", () => ({
  listActivityAlerts: (...args: unknown[]) => listActivityAlerts(...args),
  markAlertRead: (...args: unknown[]) => markAlertRead(...args),
  markAllAlertsRead: (...args: unknown[]) => markAllAlertsRead(...args),
  countUnreadAlerts: vi.fn(),
}));

import { GET as listAlerts } from "@/app/api/pro/alerts/route";
import { PATCH as markRead } from "@/app/api/pro/alerts/[id]/read/route";
import { POST as markAll } from "@/app/api/pro/alerts/read-all/route";

const WATCHED = new Date(Date.UTC(2026, 10, 13, 0, 0, 0));
const RECORDED = new Date(Date.UTC(2026, 10, 15, 0, 0, 0));
const REWATCHED = new Date(Date.UTC(2026, 10, 20, 0, 0, 0));

function sessionFor(userId: string | null) {
  if (!userId) return { session: null, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { session: { userId, role: "gallery" }, error: null };
}

function participation(overrides: Partial<AlertParticipation> = {}): AlertParticipation {
  return {
    exhibitionId: "exhibition-new",
    artistEntityId: "artist-a",
    recordedAt: RECORDED,
    eventYear: 2026,
    isPublic: true,
    ...overrides,
  };
}

function watch(overrides: Partial<AlertWatch> = {}): AlertWatch {
  return { userId: "user-a", artistEntityId: "artist-a", createdAt: WATCHED, ...overrides };
}

function filesUnder(dir: string): string[] {
  const absolute = path.join(process.cwd(), dir);
  const found: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = path.join(current, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) found.push(full);
    }
  };
  walk(absolute);
  return found;
}

describe("activity alert planning", () => {
  it("uses historical copy for an older exhibition recorded today", () => {
    const planned = planActivityAlerts({
      participations: [participation({ eventYear: 1998 })],
      watches: [watch()],
    });
    expect(planned).toHaveLength(1);
    expect(planned[0]?.isHistoricalBackfill).toBe(true);
    expect(alertMessage(planned[0]!)).toBe("ROB에 1998년 전시 기록이 새로 추가되었습니다.");
    expect(alertMessage(planned[0]!)).not.toContain("새로운 전시 활동");
  });

  it("uses current copy for an exhibition in the recording year", () => {
    const planned = planActivityAlerts({
      participations: [participation({ eventYear: 2026 })],
      watches: [watch()],
    });
    expect(planned).toHaveLength(1);
    expect(planned[0]?.isHistoricalBackfill).toBe(false);
    expect(alertMessage(planned[0]!)).toBe(CURRENT_ACTIVITY_MESSAGE);
    expect(CURRENT_ACTIVITY_MESSAGE).not.toMatch(/방금|지금 전시|새 전시가 열렸/);
  });

  it("does not alert for exhibitions that were already public before the watch", () => {
    const old = Array.from({ length: 20 }, (_, index) => participation({
      exhibitionId: `old-${index}`,
      recordedAt: new Date(Date.UTC(2020, 0, index + 1)),
      eventYear: 1990 + index,
    }));
    expect(planActivityAlerts({ participations: old, watches: [watch()] })).toEqual([]);
  });

  it("does not alert after unwatch, and a rewatch does not replay old records", () => {
    const publishedWhileUnwatched = participation({ recordedAt: new Date(Date.UTC(2026, 10, 16)) });
    expect(planActivityAlerts({ participations: [publishedWhileUnwatched], watches: [] })).toEqual([]);
    const again = planActivityAlerts({
      participations: [
        participation({ eventYear: 1998 }),
        participation({ exhibitionId: "after-rewatch", recordedAt: new Date(Date.UTC(2026, 10, 21)), eventYear: 2026 }),
      ],
      watches: [watch({ createdAt: REWATCHED })],
    });
    expect(again.map((row) => row.exhibitionId)).toEqual(["after-rewatch"]);
  });

  it("keeps one alert when publication is retried", () => {
    const first = planActivityAlerts({
      participations: [participation()],
      watches: [watch(), watch({ userId: "user-b" })],
    });
    expect(first).toHaveLength(2);
    expect(first.every((row) => row.type === ALERT_TYPE)).toBe(true);
    const keys = new Set(first.map((row) => `${row.userId}\n${row.artistEntityId}\n${row.exhibitionId}\n${row.type}`));
    expect(planActivityAlerts({
      participations: [participation()],
      watches: [watch(), watch({ userId: "user-b" })],
      existingKeys: keys,
    })).toEqual([]);
  });

  it("alerts only the watcher, and only for a public participation", () => {
    const planned = planActivityAlerts({
      participations: [
        participation(),
        participation({ exhibitionId: "draft", isPublic: false }),
      ],
      watches: [watch()],
    });
    expect(planned.map((row) => row.userId)).toEqual(["user-a"]);
    expect(planActivityAlerts({
      participations: [participation()],
      watches: [watch({ userId: "user-b", artistEntityId: "someone-else" })],
    })).toEqual([]);
  });

  it("pages 24 alerts and does not model saved-search or shortlist alerts", () => {
    expect(ALERT_PAGE_SIZE).toBe(24);
    const source = readFileSync(path.join(process.cwd(), "lib/pro/activityAlertPolicy.ts"), "utf8");
    expect(source).not.toContain("ArtistShortlist");
    expect(source).not.toContain("SavedDiscoverySearch");
  });
});

describe("activity alert routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as { __proFlag?: boolean }).__proFlag = false;
    enforceRateLimit.mockReturnValue(null);
    requireUserSession.mockImplementation(() => {
      throw new Error("auth should not run");
    });
  });

  it("returns 404 before auth when the flag is off", async () => {
    const page = readFileSync(path.join(process.cwd(), "app/pro/alerts/page.tsx"), "utf8");
    expect(page.indexOf("if (!isProDiscoveryEnabled())")).toBeLessThan(page.indexOf("getServerSession()"));
    for (const call of [
      listAlerts(new Request("https://rob.test/api/pro/alerts")),
      markRead(new Request("https://rob.test/api/pro/alerts/alert-a/read", { method: "PATCH", body: "{}" }), { params: { id: "alert-a" } }),
      markAll(new Request("https://rob.test/api/pro/alerts/read-all", { method: "POST", body: "{}" })),
    ]) {
      const response = await call;
      expect(response.status).toBe(404);
    }
    expect(enforceRateLimit).not.toHaveBeenCalled();
    expect(requireUserSession).not.toHaveBeenCalled();
  });

  it("returns 401 for an anonymous reader when the flag is on", async () => {
    (globalThis as { __proFlag?: boolean }).__proFlag = true;
    requireUserSession.mockReturnValue(sessionFor(null));
    const response = await listAlerts(new Request("https://rob.test/api/pro/alerts"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(listActivityAlerts).not.toHaveBeenCalled();
  });

  it("rejects a client userId and hides another user's alert", async () => {
    (globalThis as { __proFlag?: boolean }).__proFlag = true;
    requireUserSession.mockReturnValue(sessionFor("user-b"));
    const rejected = await markRead(
      new Request("https://rob.test/api/pro/alerts/alert-a/read", {
        method: "PATCH",
        body: JSON.stringify({ userId: "user-a" }),
      }),
      { params: { id: "alert-a" } },
    );
    expect(rejected.status).toBe(400);
    expect(markAlertRead).not.toHaveBeenCalled();
    markAlertRead.mockResolvedValue(null);
    const missing = await markRead(
      new Request("https://rob.test/api/pro/alerts/alert-a/read", { method: "PATCH", body: "{}" }),
      { params: { id: "alert-a" } },
    );
    expect(missing.status).toBe(404);
    expect(await missing.text()).not.toContain("ROB에 1998년");
    expect(markAlertRead).toHaveBeenCalledWith("user-b", "alert-a");
  });

  it("marks the session user's alerts read", async () => {
    (globalThis as { __proFlag?: boolean }).__proFlag = true;
    requireUserSession.mockReturnValue(sessionFor("user-a"));
    markAlertRead.mockResolvedValue({ readAt: RECORDED });
    markAllAlertsRead.mockResolvedValue(2);
    const one = await markRead(
      new Request("https://rob.test/api/pro/alerts/alert-a/read", { method: "PATCH", body: "{}" }),
      { params: { id: "alert-a" } },
    );
    const all = await markAll(new Request("https://rob.test/api/pro/alerts/read-all", { method: "POST", body: "{}" }));
    expect(one.status).toBe(200);
    expect(all.status).toBe(200);
    expect(markAllAlertsRead).toHaveBeenCalledWith("user-a");
  });
});

describe("activity alert boundaries", () => {
  it("hooks publication only and leaves acquisition, claims, and admin alone", () => {
    const publish = readFileSync(path.join(process.cwd(), "lib/history/researchPublish.ts"), "utf8");
    const submission = readFileSync(path.join(process.cwd(), "lib/history/mutate.ts"), "utf8");
    expect(publish).toContain("await followPublicParticipation");
    expect(submission).toContain('write.publicationStatus === "PUBLIC"');
    expect(readFileSync(path.join(process.cwd(), "lib/history/exhibitionArchive.ts"), "utf8")).not.toContain("recordPublicParticipationAlerts");
    expect(readFileSync(path.join(process.cwd(), "lib/history/expansionScheduler.ts"), "utf8")).not.toContain("recordPublicParticipationAlerts");
    expect(readFileSync(path.join(process.cwd(), "lib/history/sourceReview.ts"), "utf8")).not.toContain("ActivityAlert");
    const admin = filesUnder("app/api/admin").map((file) => readFileSync(file, "utf8")).join("\n");
    const claims = filesUnder("app/api").filter((file) => file.toLowerCase().includes("claim")).map((file) => readFileSync(file, "utf8")).join("\n");
    expect(admin).not.toContain("ActivityAlert");
    expect(claims).not.toContain("ActivityAlert");
    const discovery = readFileSync(path.join(process.cwd(), "lib/pro/discoveryQuery.ts"), "utf8");
    expect(discovery).toContain("publicExhibitionWhere");
    expect(discovery).not.toContain("ActivityAlert");
  });

  it("keeps the migration additive and the events free of private content", () => {
    const sql = readFileSync(path.join(process.cwd(), "prisma/sql/add-pro-activity-alerts.sql"), "utf8");
    const stripped = sql.replace(/ON DELETE CASCADE/g, "").replace(/ON UPDATE CASCADE/g, "");
    expect(stripped).not.toMatch(/\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b|\bUPDATE\s+/);
    expect(sql).toContain("ActivityAlert_userId_artistEntityId_exhibitionId_type_key");
    expect(isHistoryEvent("PRO_ALERTS_OPENED")).toBe(true);
    expect(isHistoryEvent("PRO_ALERT_OPENED")).toBe(true);
    expect(isHistoryEvent("PRO_ALERT_MARKED_READ")).toBe(true);
    expect(isHistoryEvent("PRO_ALERT_MARK_ALL_READ")).toBe(true);
    const actions = readFileSync(path.join(process.cwd(), "app/pro/alerts/AlertActions.tsx"), "utf8");
    expect(actions).not.toContain("message");
    expect(actions).not.toContain("userId");
    const page = readFileSync(path.join(process.cwd(), "app/pro/alerts/page.tsx"), "utf8");
    expect(page).toContain("{item.message}");
    expect(page).not.toContain("dangerouslySetInnerHTML");
  });
});
