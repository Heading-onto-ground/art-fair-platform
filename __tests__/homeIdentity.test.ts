import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { historyCopy, resolveHistoryLocale } from "@/lib/history/locale";

const root = resolve(__dirname, "..");

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("ROB public home", () => {
  it("serves localized history search at /", () => {
    const home = read("app/page.tsx");
    const search = read("app/components/history/HistoryHome.tsx");
    expect(home).toContain("HistoryHome");
    expect(home).toContain("historyCopy");
    expect(home).toContain("historyLocale");
    expect(home).not.toContain("NowPage");
    expect(home).not.toContain("LaborSurveyHome");
    expect(home).not.toContain("ArtistFeed");
    expect(search).toContain('role="search"');
    expect(search).toContain("copy.searchTitle");

    const english = historyCopy("en");
    const korean = historyCopy("ko");
    expect(`${english.searchTitle} ${english.searchLead}`).toBe("Search an artist. Enter their world.");
    expect(english.pageTitle).toBe("ROB — Artist History & Documented Connections");
    expect(korean.pageTitle).toBe("ROB — 작가의 전시 이력과 기록된 연결");
    expect(korean.searchTitle).toBe("작가를 검색하세요.");
    expect(korean.searchLead).toBe("그 작가의 세계로 들어갑니다.");
    expect(resolveHistoryLocale("en", "ko-KR,ko;q=0.9")).toBe("en");
    expect(resolveHistoryLocale(undefined, "ko-KR,ko;q=0.9")).toBe("ko");
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
