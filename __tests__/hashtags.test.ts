import { describe, it, expect } from "vitest";
import { parseHashtags, normalizeHashtag, segmentCaption } from "../lib/hashtags";

describe("hashtags", () => {
  it("parses multiple hashtags", () => {
    expect(parseHashtags("Blue room #painting #memory")).toEqual(["painting", "memory"]);
  });

  it("normalizes tag", () => {
    expect(normalizeHashtag("#Painting")).toBe("painting");
  });

  it("segments caption for rendering", () => {
    const segs = segmentCaption("Hello #art world");
    expect(segs.some((s) => s.type === "tag" && s.value === "art")).toBe(true);
  });
});
