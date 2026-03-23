/**
 * Unit tests for streak calculation logic.
 * Foundation for QA AI / QA Planning agent.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRecordedDates,
  hasRecordedToday,
  calculateStreak,
} from "@/utils/streak";
import type { ArtistMoment } from "@/types";

function makeMoment(dateStr: string, id = "m1"): ArtistMoment {
  return {
    id,
    artistId: "a1",
    artistName: "Artist",
    imageUri: "https://example.com/img.jpg",
    state: "working",
    medium: "painting",
    createdAt: dateStr,
  };
}

describe("getRecordedDates", () => {
  it("returns unique dates sorted newest first", () => {
    const moments = [
      makeMoment("2025-03-15T12:00:00Z", "m1"),
      makeMoment("2025-03-15T12:00:00Z", "m2"),
      makeMoment("2025-03-14T12:00:00Z", "m3"),
    ];
    const dates = getRecordedDates(moments);
    expect(dates).toHaveLength(2);
    expect(dates[0]).toBe("2025-03-15");
    expect(dates[1]).toBe("2025-03-14");
  });

  it("returns empty array for no moments", () => {
    expect(getRecordedDates([])).toEqual([]);
  });
});

describe("hasRecordedToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns true when user recorded today", () => {
    vi.setSystemTime(new Date("2025-03-16T14:00:00Z"));
    const moments = [makeMoment("2025-03-16T10:00:00Z")];
    expect(hasRecordedToday(moments)).toBe(true);
  });

  it("returns false when user did not record today", () => {
    vi.setSystemTime(new Date("2025-03-16T14:00:00Z"));
    const moments = [makeMoment("2025-03-15T10:00:00Z")];
    expect(hasRecordedToday(moments)).toBe(false);
  });

  it("returns false for empty moments", () => {
    vi.setSystemTime(new Date("2025-03-16T14:00:00Z"));
    expect(hasRecordedToday([])).toBe(false);
  });
});

describe("calculateStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns 0 for no moments", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("returns 0 when streak is broken (no recent activity)", () => {
    vi.setSystemTime(new Date("2025-03-16T14:00:00Z"));
    const moments = [
      makeMoment("2025-03-10T10:00:00Z"),
      makeMoment("2025-03-11T10:00:00Z"),
    ];
    expect(calculateStreak(moments)).toBe(0);
  });

  it("returns streak when user recorded today", () => {
    vi.setSystemTime(new Date("2025-03-16T14:00:00Z"));
    const moments = [
      makeMoment("2025-03-16T10:00:00Z"),
      makeMoment("2025-03-15T10:00:00Z"),
      makeMoment("2025-03-14T10:00:00Z"),
    ];
    expect(calculateStreak(moments)).toBe(3);
  });

  it("returns streak when user recorded yesterday (counts from yesterday)", () => {
    vi.setSystemTime(new Date("2025-03-16T14:00:00Z"));
    const moments = [
      makeMoment("2025-03-15T10:00:00Z"),
      makeMoment("2025-03-14T10:00:00Z"),
      makeMoment("2025-03-13T10:00:00Z"),
    ];
    expect(calculateStreak(moments)).toBe(3);
  });

  it("stops counting when a day is missed", () => {
    vi.setSystemTime(new Date("2025-03-16T14:00:00Z"));
    const moments = [
      makeMoment("2025-03-16T10:00:00Z"),
      makeMoment("2025-03-15T10:00:00Z"),
      makeMoment("2025-03-13T10:00:00Z"),
    ];
    expect(calculateStreak(moments)).toBe(2);
  });
});
