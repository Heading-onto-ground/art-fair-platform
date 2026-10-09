import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("ROB studio route", () => {
  it("serves the artwork feed at /studio", () => {
    const studio = read("app/studio/page.tsx");
    expect(studio).toContain("ArtistFeed");
    expect(studio).not.toContain("NowPage");
    expect(studio).not.toContain("HistoryHome");
    expect(studio).not.toContain("LaborSurveyHome");
  });
});
