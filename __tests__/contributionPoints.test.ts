import { describe, it, expect } from "vitest";
import {
  calcProfileScore,
  computeContributionPoints,
  MATERIAL_BENEFIT_THRESHOLD,
  type ProfileCompletionData,
} from "../lib/contributionPoints";

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

describe("contributionPoints", () => {
  it("빈 프로필은 0점", () => {
    const result = computeContributionPoints({
      profile: emptyProfile,
      seriesCount: 0,
      artEvents: [],
      selfExhibitionCount: 0,
      ritualMomentCount: 0,
    });
    expect(result.total).toBe(0);
    expect(result.level).toBe(1);
  });

  it("프로필 완성만으로 100점", () => {
    expect(calcProfileScore(fullProfile)).toBe(100);
  });

  it("시리즈 3개면 추가 20점", () => {
    const result = computeContributionPoints({
      profile: { ...fullProfile, hasSeries: true },
      seriesCount: 3,
      artEvents: [],
      selfExhibitionCount: 0,
      ritualMomentCount: 0,
    });
    expect(result.summary.series).toBe(20);
    expect(result.total).toBe(120);
  });

  it("전시 활동 기록은 건당 20점", () => {
    const result = computeContributionPoints({
      profile: emptyProfile,
      seriesCount: 0,
      artEvents: [{ eventType: "exhibition", title: "Solo" }],
      selfExhibitionCount: 0,
      ritualMomentCount: 0,
    });
    expect(result.summary.activity).toBe(20);
  });

  it("100점 이상이면 material benefit 자격", () => {
    const result = computeContributionPoints({
      profile: fullProfile,
      seriesCount: 1,
      artEvents: [],
      selfExhibitionCount: 0,
      ritualMomentCount: 0,
    });
    expect(result.total).toBe(100);
    expect(result.materialBenefitEligible).toBe(true);
    expect(MATERIAL_BENEFIT_THRESHOLD).toBe(100);
  });

  it("리추얼 기록은 최대 50점까지", () => {
    const result = computeContributionPoints({
      profile: emptyProfile,
      seriesCount: 0,
      artEvents: [],
      selfExhibitionCount: 0,
      ritualMomentCount: 80,
    });
    expect(result.summary.ritual).toBe(50);
  });

  it("7일 연속 기록 보너스", () => {
    const result = computeContributionPoints({
      profile: emptyProfile,
      seriesCount: 0,
      artEvents: [],
      selfExhibitionCount: 0,
      ritualMomentCount: 0,
      ritualStreak: 7,
    });
    expect(result.items.some((i) => i.id === "streak_7")).toBe(true);
    expect(result.summary.ritual).toBe(10);
  });
});
