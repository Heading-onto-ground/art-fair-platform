import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("ROB public home", () => {
  it("serves history search at /", () => {
    const home = read("app/page.tsx");
    expect(home).toContain("HistoryHome");
    expect(home).toContain("Search an artist. See their journey.");
    expect(home).not.toContain("NowPage");
    expect(home).not.toContain("LaborSurveyHome");
    expect(home).not.toContain("ArtistFeed");
  });
});

describe("ROB now route", () => {
  it("keeps the now feed on /now", () => {
    const now = read("app/now/page.tsx");
    expect(now).toContain("NowPage");
    expect(now).not.toContain("HistoryHome");
    expect(now).not.toContain("LaborSurveyHome");
    expect(now).not.toContain("ArtistFeed");
  });
});
