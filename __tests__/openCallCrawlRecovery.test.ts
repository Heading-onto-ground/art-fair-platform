import { describe, expect, it, vi } from "vitest";
import {
  commitCrawlEffects,
  crawlRunStatus,
  deadlineFromOpportunityText,
  externalIdsSafeToExpire,
  isActiveDeadline,
  isCrawlStale,
  isScheduledCronRequest,
  isSyntheticCrawlRow,
  openCallIdentityKey,
  parseExplicitDeadline,
  planCrawlInserts,
  rejectionReason,
  settleSources,
} from "@/lib/openCall/crawlRecovery";

const now = new Date("2026-11-13T12:00:00Z");

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? values[name] ?? null };
}

describe("scheduled cron detection", () => {
  it("accepts the current Vercel cron headers without the legacy flag", () => {
    expect(isScheduledCronRequest(headers({ "user-agent": "vercel-cron/1.0", "x-vercel-cron-schedule": "0 19 * * *" }))).toBe(true);
  });

  it("still accepts the legacy header and an authorized manual run", () => {
    expect(isScheduledCronRequest(headers({ "x-vercel-cron": "1" }))).toBe(true);
    expect(isScheduledCronRequest(headers({ "x-cron-run": "1" }))).toBe(true);
  });
});

describe("deadline parsing", () => {
  it("does not use an RSS publication date as an application deadline", () => {
    expect(deadlineFromOpportunityText({
      title: "Open call for artists",
      description: "International residency",
      pubDate: "Fri, 21 Aug 2026 19:00:00 GMT",
    }, now)).toBeNull();
  });

  it("keeps an explicit deadline written in the item", () => {
    expect(deadlineFromOpportunityText({
      title: "Artist residency",
      description: "Deadline 2026-12-01",
      pubDate: "Fri, 01 Jan 2026 00:00:00 GMT",
    }, now)).toBe("2026-12-01");
  });

  it("does not roll a past month-day into next year", () => {
    expect(parseExplicitDeadline("10/15 모집 결과 발표", now)).toBeNull();
  });

  it("keeps a future month-day in the current year", () => {
    expect(parseExplicitDeadline("신청 마감 12/20", now)).toBe("2026-12-20");
  });
});

describe("candidate rejection", () => {
  it("rejects result announcements and ordinary exhibition announcements", () => {
    expect(rejectionReason("2026 공모 선정 결과 발표")).toBe("RESULT_ANNOUNCEMENT");
    expect(rejectionReason("Exhibition announcement: the summer show is now on view")).toBe("EXHIBITION_ANNOUNCEMENT");
  });

  it("rejects expired opportunities and keeps a real future deadline", () => {
    expect(isActiveDeadline("2026-08-01", now.getTime())).toBe(false);
    expect(isActiveDeadline("2026-12-01", now.getTime())).toBe(true);
  });
});

describe("dedupe and protected rows", () => {
  it("does not collapse different opportunities on the same host", () => {
    const first = openCallIdentityKey({ theme: "Residency A", deadline: "2026-12-01", externalUrl: "https://example.org/a" });
    const second = openCallIdentityKey({ theme: "Grant B", deadline: "2026-12-15", externalUrl: "https://example.org/b" });
    expect(first).not.toBe(second);
  });

  it("treats the same host, title, and deadline as one cycle", () => {
    const first = openCallIdentityKey({ theme: "Residency A", deadline: "2026-12-01", externalUrl: "https://example.org/a" });
    const second = openCallIdentityKey({ gallery: "Other label", theme: "Residency A", deadline: "2026-12-01", externalUrl: "https://example.org/a?ref=1" });
    expect(first).toBe(second);
  });

  it("skips duplicates, fallback rows, and expired rows before insert", () => {
    const plan = planCrawlInserts({
      now: now.getTime(),
      existingKeys: new Set([openCallIdentityKey({ theme: "Known call", deadline: "2026-12-01", externalUrl: "https://known.example/call" })]),
      existingUrls: new Set(),
      candidates: [
        { source: "live", gallery: "Known", galleryId: "a", city: "Seoul", country: "한국", theme: "Known call", deadline: "2026-12-01", externalUrl: "https://known.example/call" },
        { source: "fallback", gallery: "documenta", galleryId: "__external_documenta", city: "Kassel", country: "독일", theme: "Seed", deadline: "2026-12-01", externalUrl: "https://www.documenta.de" },
        { source: "live", gallery: "Old", galleryId: "b", city: "Seoul", country: "한국", theme: "Past call", deadline: "2026-01-01", externalUrl: "https://old.example/call" },
        { source: "live", gallery: "New", galleryId: "c", city: "Seoul", country: "한국", theme: "Open call for artists", deadline: "2026-12-20", externalUrl: "https://new.example/call" },
      ],
    });
    expect(plan.wouldInsert.map((row) => row.galleryId)).toEqual(["c"]);
    expect(plan.duplicates).toHaveLength(1);
    expect(plan.synthetic).toHaveLength(1);
    expect(plan.expired).toHaveLength(1);
    expect(isSyntheticCrawlRow("__external_art_basel")).toBe(true);
  });

  it("never selects an internal gallery open call for expiry deletion", () => {
    expect(externalIdsSafeToExpire([
      { id: "internal", isExternal: false, deadline: "2020-01-01" },
      { id: "external-old", isExternal: true, deadline: "2020-01-01" },
      { id: "external-open", isExternal: true, deadline: "2026-12-01" },
    ], now.getTime())).toEqual(["external-old"]);
  });
});

describe("read only and source isolation", () => {
  it("performs no writes in read-only mode", async () => {
    const create = vi.fn();
    const deleteExpired = vi.fn();
    const deleteExhibitionJunk = vi.fn();
    const syncEmail = vi.fn();
    const validate = vi.fn();
    const result = await commitCrawlEffects({
      readOnly: true,
      create,
      deleteExpired,
      deleteExhibitionJunk,
      syncEmail,
      validate,
      creates: [{ source: "live", gallery: "A", galleryId: "a", city: "Seoul", country: "한국", theme: "Call", deadline: "2026-12-01", externalUrl: "https://a.example" }],
      expiredIds: ["external-old"],
    });
    expect(result).toMatchObject({ created: 0, deletedExpired: 0, email: false, validation: false });
    expect(create).not.toHaveBeenCalled();
    expect(deleteExpired).not.toHaveBeenCalled();
    expect(deleteExhibitionJunk).not.toHaveBeenCalled();
    expect(syncEmail).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
  });

  it("keeps the run alive when one source throws and records partial", async () => {
    const settled = await settleSources([
      { source: "working", run: async () => ["row"] },
      { source: "broken", run: async () => { throw new Error("timeout"); } },
    ]);
    expect(settled.find((row) => row.source === "working")?.rows).toEqual(["row"]);
    expect(settled.find((row) => row.source === "broken")?.ok).toBe(false);
    expect(crawlRunStatus({ sourceAttempts: settled.length, sourceFailures: settled.filter((row) => !row.ok).length, fatal: false })).toBe("partial");
  });

  it("marks a crawl with no recent success as stale", () => {
    expect(isCrawlStale(new Date("2026-08-21T19:04:02Z"), now.getTime())).toBe(true);
    expect(isCrawlStale(new Date("2026-11-13T10:00:00Z"), now.getTime())).toBe(false);
  });
});
