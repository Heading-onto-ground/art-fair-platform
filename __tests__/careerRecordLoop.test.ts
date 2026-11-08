import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { claimState, duplicateArtistDecision } from "@/lib/history/contribution";
import { historyCopy, historyOriginLabel } from "@/lib/history/locale";
import { EXPANSION_DEFAULTS } from "@/lib/history/expansionPolicy";
import { classifyParticipant } from "@/lib/history/policy";

describe("trusted career record loop", () => {
  it("keeps claim state to the caller's own request", () => {
    expect(claimState([])).toBe("NONE");
    expect(claimState(["REJECTED"])).toBe("REJECTED");
    expect(claimState(["REJECTED", "PENDING"])).toBe("PENDING");
    expect(claimState(["PENDING", "APPROVED"])).toBe("APPROVED");
  });

  it("refuses a second artist when an exact identity already exists", () => {
    expect(duplicateArtistDecision(0)).toBe("create");
    expect(duplicateArtistDecision(1)).toBe("existing");
    expect(duplicateArtistDecision(2)).toBe("ambiguous");
  });

  it("separates who added a record from the source label", () => {
    expect(historyOriginLabel("ko", "ROB_RESEARCHED")).toBe("ROB 조사");
    expect(historyOriginLabel("ko", "ARTIST_SUBMITTED")).toBe("작가 등록");
    expect(historyOriginLabel("ko", "GALLERY_SUBMITTED")).toBe("갤러리 등록");
    expect(historyOriginLabel("ko", "INSTITUTION_SUBMITTED")).toBe("기관 등록");
    expect(historyOriginLabel("ko", "LEGACY_FIRST_PARTY")).toBe("기존 기록");
    expect(historyOriginLabel("en", "ARTIST_SUBMITTED")).toBe("Artist submitted");
    expect(historyOriginLabel("ko", "ARTIST_SUBMITTED")).not.toBe("공식 확인됨");
  });

  it("speaks Korean on the contribution surfaces", () => {
    const korean = historyCopy("ko");
    expect(korean.startKicker).toBe("내 기록 시작하기");
    expect(korean.searchYourself).toBe("내 작가 기록 찾기");
    expect(korean.claimThis).toBe("이 기록 관리 신청");
    expect(korean.createRecord).toBe("새 작가 기록 시작");
    expect(korean.addKicker).toBe("전시 기록 추가");
    expect(korean.addExhibitionButton).toBe("전시 추가");
    expect(korean.savedForReview).toBe("검토를 위해 저장되었습니다.");
    expect(korean.addOwnedExhibition).toBe("전시 기록 추가");
    expect(korean.claimYourself).toBe("이 작가 본인인가요? 기록 관리 신청");
    expect(korean.claimPending).toBe("기록 관리 신청 검토 중");
    const start = readFileSync("app/components/history/StartHistory.tsx", "utf8");
    const add = readFileSync("app/components/history/AddExhibition.tsx", "utf8");
    expect(start).toContain("historyCopy");
    expect(start).not.toContain("Start your history");
    expect(add).toContain("historyCopy");
    expect(add).not.toContain("Add exhibition");
    expect(add).not.toContain("Saved for review");
  });

  it("shows origin beside the source and does not call an approved claim verified", () => {
    const experience = readFileSync("app/components/history/HistoryExperience.tsx", "utf8");
    const exhibition = readFileSync("app/components/history/HistoryExhibition.tsx", "utf8");
    expect(experience).toContain("historyOriginLabel");
    expect(experience).toContain("copy.addOwnedExhibition");
    expect(experience).toContain("copy.claimPending");
    expect(experience).toContain('trackHistory("SOURCE_OPENED")');
    expect(experience).not.toContain("Verified artist");
    expect(exhibition).toContain("historyOriginLabel");
    expect(exhibition).toContain("copy.source");
  });

  it("leaves an unmatched or ambiguous participant unresolved", () => {
    expect(classifyParticipant(1)).toBe("LINKED");
    expect(classifyParticipant(0)).toBe("UNRESOLVED_PARTICIPANT");
    expect(classifyParticipant(2)).toBe("REVIEW_REQUIRED");
    const mutate = readFileSync("lib/history/mutate.ts", "utf8");
    const participants = mutate.slice(mutate.indexOf("for (const label of input.participantNames"));
    expect(mutate).toContain("classifyParticipant");
    expect(participants).toContain("historyUnresolvedName.create");
    expect(participants).not.toContain("artistEntity.create");
  });

  it("keeps the search bridge and leaves expansion switched off", () => {
    const route = readFileSync("app/api/history/search/route.ts", "utf8");
    expect(route).toContain("results.length === 0 ? await searchRecordedMentions(query)");
    expect(EXPANSION_DEFAULTS.enabled).toBe(false);
    const policy = readFileSync("lib/history/expansionPolicy.ts", "utf8");
    expect(policy).toContain('EXPANSION_KILL_SWITCH = "ROB_EXPANSION_ENABLED"');
  });
});
