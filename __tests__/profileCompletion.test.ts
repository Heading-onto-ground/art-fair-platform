import { describe, it, expect } from "vitest";
import {
  calcProfileScore,
  PROFILE_STEPS,
  type ProfileCompletionData,
} from "../lib/contributionPoints";

const STEPS_POINTS: Record<keyof ProfileCompletionData, number> = Object.fromEntries(
  PROFILE_STEPS.map((s) => [s.key, s.points]),
) as Record<keyof ProfileCompletionData, number>;

function calcScore(data: ProfileCompletionData): number {
  return calcProfileScore(data);
}

const emptyProfile: ProfileCompletionData = {
  hasName: false,
  hasProfileImage: false,
  hasGenre: false,
  hasLocation: false,
  hasBio: false,
  hasSocialOrWebsite: false,
  hasWorkNote: false,
  hasSeries: false,
  hasArtEvents: false,
  hasPortfolioUrl: false,
};

const fullProfile: ProfileCompletionData = {
  hasName: true,
  hasProfileImage: true,
  hasGenre: true,
  hasLocation: true,
  hasBio: true,
  hasSocialOrWebsite: true,
  hasWorkNote: true,
  hasSeries: true,
  hasArtEvents: true,
  hasPortfolioUrl: true,
};

describe("프로필 완성도 점수 계산", () => {
  it("빈 프로필은 0점", () => {
    expect(calcScore(emptyProfile)).toBe(0);
  });

  it("완전한 프로필은 100점", () => {
    expect(calcScore(fullProfile)).toBe(100);
  });

  it("이름만 있으면 10점", () => {
    expect(calcScore({ ...emptyProfile, hasName: true })).toBe(10);
  });

  it("프로필 이미지만 있으면 15점", () => {
    expect(calcScore({ ...emptyProfile, hasProfileImage: true })).toBe(15);
  });

  it("이름+이미지+장르는 35점", () => {
    expect(calcScore({ ...emptyProfile, hasName: true, hasProfileImage: true, hasGenre: true })).toBe(35);
  });

  it("소셜 OR 웹사이트 하나만 있어도 5점", () => {
    expect(calcScore({ ...emptyProfile, hasSocialOrWebsite: true })).toBe(5);
  });

  it("모든 항목의 포인트 합이 100", () => {
    const total = Object.values(STEPS_POINTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});
