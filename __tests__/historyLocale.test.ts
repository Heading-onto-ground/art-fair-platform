import { describe, expect, it } from "vitest";
import { countNoun, resolveHistoryLocale } from "@/lib/history/locale";

describe("history locale", () => {
  it("prefers an explicit cookie over the browser language", () => {
    expect(resolveHistoryLocale("en", "ko-KR,ko;q=0.9")).toBe("en");
    expect(resolveHistoryLocale("ko", "en-US")).toBe("ko");
  });

  it("uses Korean when the first Accept-Language tag is Korean", () => {
    expect(resolveHistoryLocale(undefined, "ko-KR,ko;q=0.9,en;q=0.8")).toBe("ko");
    expect(resolveHistoryLocale(undefined, "en-US,ko;q=0.5")).toBe("en");
    expect(resolveHistoryLocale(undefined, null)).toBe("en");
  });

  it("keeps the English record phrase and gives Korean its own label", () => {
    expect(countNoun("en", 1, "record")).toBe("record currently documented in ROB");
    expect(countNoun("en", 3, "record")).toBe("records currently documented in ROB");
    expect(countNoun("ko", 3, "exhibition")).toBe("현재 ROB에 기록된 전시");
  });
});
