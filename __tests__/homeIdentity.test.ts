import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("ROB homepage identity", () => {
  it("serves artist search at / and keeps NOW on its own route", () => {
    const home = read("app/page.tsx");
    const now = read("app/now/page.tsx");
    const studio = read("app/studio/page.tsx");
    expect(home).toContain("HistoryHome");
    expect(home).toContain("Search an artist. See their journey.");
    expect(home).not.toContain("NowPage");
    expect(home).not.toContain("LaborSurveyHome");
    expect(now).toContain('from "@/app/components/NowPage"');
    expect(studio).toContain('from "@/app/components/NowPage"');
    expect(studio).not.toContain("LaborSurveyHome");
  });

  it("keeps the labor survey on its own project route", () => {
    const survey = read("app/labor-survey/page.tsx");
    expect(survey).toContain("LaborSurveyHome");
    expect(survey).not.toContain("NowPage");
  });

  it("opens the installed app on the public search home", () => {
    const manifest = read("app/manifest.ts");
    expect(manifest).toMatch(/start_url:\s*"\/"/);
  });
});
