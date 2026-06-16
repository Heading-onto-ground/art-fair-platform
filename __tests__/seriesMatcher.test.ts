import { describe, it, expect } from "vitest";
import {
  normalizeSeriesKey,
  findBestSeriesMatch,
  suggestSeriesTitle,
} from "../lib/seriesMatcher";

describe("seriesMatcher", () => {
  it("strips numbering from titles", () => {
    expect(normalizeSeriesKey("Blue Room #3")).toBe("blue room");
  });

  it("matches similar series titles", () => {
    const match = findBestSeriesMatch(
      "Blue Room #2",
      "oil on canvas",
      [{ id: "s1", title: "Blue Room" }],
    );
    expect(match?.id).toBe("s1");
  });

  it("suggests cleaned series title", () => {
    expect(suggestSeriesTitle("Blue Room #4", null)).toBe("Blue Room");
  });
});
