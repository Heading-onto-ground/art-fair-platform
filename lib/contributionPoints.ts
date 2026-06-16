/**
 * ROB Contribution Points — activity-based score (not cash-for-upload).
 * Computed from profile + series + activities + exhibitions + ritual practice.
 */

export type ProfileCompletionData = {
  hasName: boolean;
  hasProfileImage: boolean;
  hasGenre: boolean;
  hasLocation: boolean;
  hasBio: boolean;
  hasSocialOrWebsite: boolean;
  hasWorkNote: boolean;
  hasSeries: boolean;
  hasArtEvents: boolean;
  hasPortfolioUrl: boolean;
};

export type ProfileStep = {
  key: keyof ProfileCompletionData;
  labelKo: string;
  labelEn: string;
  points: number;
};

export const PROFILE_STEPS: ProfileStep[] = [
  { key: "hasName", labelKo: "이름 입력", labelEn: "Add your name", points: 10 },
  { key: "hasProfileImage", labelKo: "프로필 사진 등록", labelEn: "Upload profile photo", points: 15 },
  { key: "hasGenre", labelKo: "장르/매체 입력", labelEn: "Set your genre/medium", points: 10 },
  { key: "hasLocation", labelKo: "국가·도시 설정", labelEn: "Set country & city", points: 10 },
  { key: "hasBio", labelKo: "소개글 작성", labelEn: "Write a bio", points: 15 },
  { key: "hasSocialOrWebsite", labelKo: "인스타그램 또는 웹사이트 연결", labelEn: "Link Instagram or website", points: 5 },
  { key: "hasWorkNote", labelKo: "작업 노트 작성", labelEn: "Write a work note", points: 10 },
  { key: "hasSeries", labelKo: "시리즈 1개 이상 등록", labelEn: "Add at least one series", points: 10 },
  { key: "hasArtEvents", labelKo: "활동 기록 1개 이상", labelEn: "Add at least one activity", points: 10 },
  { key: "hasPortfolioUrl", labelKo: "포트폴리오 URL 등록", labelEn: "Add portfolio URL", points: 5 },
];

export const ART_EVENT_POINTS: Record<string, number> = {
  exhibition: 20,
  collaboration: 10,
  publication: 10,
  series_start: 5,
  residency: 15,
  award: 15,
  grant: 15,
  opencall_result: 10,
  press: 10,
};

export const SERIES_EXTRA_POINTS = 10;
export const SELF_EXHIBITION_POINTS = 20;
export const RITUAL_POINT_EACH = 1;
export const RITUAL_POINT_CAP = 50;
export const STREAK_BONUS_7 = 10;
export const STREAK_BONUS_30 = 25;

export const ARTWORK_POINT_EACH = 1;
export const ARTWORK_POINT_CAP = 100;
export const MATERIAL_BENEFIT_THRESHOLD = 100;

export type ContributionCategory = "profile" | "series" | "activity" | "exhibition" | "ritual" | "artwork";

export type ContributionItem = {
  id: string;
  category: ContributionCategory;
  labelKo: string;
  labelEn: string;
  points: number;
  count?: number;
};

export type ContributionInput = {
  profile: ProfileCompletionData;
  seriesCount: number;
  artEvents: { eventType: string; title: string }[];
  selfExhibitionCount: number;
  ritualMomentCount: number;
  ritualStreak?: number;
  artworkCount?: number;
};

export type ContributionResult = {
  total: number;
  level: number;
  levelLabelKo: string;
  levelLabelEn: string;
  nextMilestone: number | null;
  progressToNext: number;
  materialBenefitEligible: boolean;
  items: ContributionItem[];
  summary: Record<ContributionCategory, number>;
};

const LEVELS = [
  { min: 0, level: 1, ko: "입문", en: "Beginner" },
  { min: 50, level: 2, ko: "시작", en: "Emerging" },
  { min: 100, level: 3, ko: "기록 작가", en: "Recording Artist" },
  { min: 200, level: 4, ko: "활동 작가", en: "Active Artist" },
  { min: 400, level: 5, ko: "마스터", en: "Master" },
] as const;

const MILESTONES = [50, 100, 200, 400, 800];

export function calcProfileScore(data: ProfileCompletionData): number {
  return PROFILE_STEPS.reduce((acc, s) => acc + (data[s.key] ? s.points : 0), 0);
}

function getLevelInfo(total: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const lvl of LEVELS) {
    if (total >= lvl.min) current = lvl;
  }
  return current;
}

function getNextMilestone(total: number): number | null {
  for (const m of MILESTONES) {
    if (total < m) return m;
  }
  return null;
}

function progressBetween(total: number, next: number | null): number {
  if (next === null) return 100;
  const prev = MILESTONES.filter((m) => m <= total).pop() ?? 0;
  if (next <= prev) return 100;
  return Math.round(((total - prev) / (next - prev)) * 100);
}

const ART_EVENT_LABELS: Record<string, { ko: string; en: string }> = {
  exhibition: { ko: "전시", en: "Exhibition" },
  collaboration: { ko: "협업", en: "Collaboration" },
  publication: { ko: "출판", en: "Publication" },
  series_start: { ko: "시리즈 시작", en: "Series start" },
  residency: { ko: "레지던시", en: "Residency" },
  award: { ko: "수상", en: "Award" },
  grant: { ko: "지원금", en: "Grant" },
  opencall_result: { ko: "오픈콜 결과", en: "Open call result" },
  press: { ko: "보도", en: "Press" },
};

export function computeContributionPoints(input: ContributionInput): ContributionResult {
  const items: ContributionItem[] = [];
  const summary: Record<ContributionCategory, number> = {
    profile: 0,
    series: 0,
    activity: 0,
    exhibition: 0,
    ritual: 0,
    artwork: 0,
  };

  for (const step of PROFILE_STEPS) {
    if (!input.profile[step.key]) continue;
    items.push({
      id: `profile_${step.key}`,
      category: "profile",
      labelKo: step.labelKo,
      labelEn: step.labelEn,
      points: step.points,
    });
    summary.profile += step.points;
  }

  if (input.seriesCount > 1) {
    const extra = input.seriesCount - 1;
    const pts = extra * SERIES_EXTRA_POINTS;
    items.push({
      id: "series_extra",
      category: "series",
      labelKo: `추가 시리즈 ${extra}개`,
      labelEn: `${extra} additional series`,
      points: pts,
      count: extra,
    });
    summary.series += pts;
  }

  const eventTypeCounts = new Map<string, number>();
  for (const ev of input.artEvents) {
    const t = ev.eventType || "exhibition";
    eventTypeCounts.set(t, (eventTypeCounts.get(t) ?? 0) + 1);
  }
  for (const [eventType, count] of eventTypeCounts) {
    const each = ART_EVENT_POINTS[eventType] ?? 10;
    const pts = each * count;
    const labels = ART_EVENT_LABELS[eventType] ?? { ko: eventType, en: eventType };
    items.push({
      id: `activity_${eventType}`,
      category: "activity",
      labelKo: count > 1 ? `${labels.ko} ${count}건` : labels.ko,
      labelEn: count > 1 ? `${labels.en} ×${count}` : labels.en,
      points: pts,
      count,
    });
    summary.activity += pts;
  }

  if (input.selfExhibitionCount > 0) {
    const pts = input.selfExhibitionCount * SELF_EXHIBITION_POINTS;
    items.push({
      id: "self_exhibitions",
      category: "exhibition",
      labelKo:
        input.selfExhibitionCount > 1
          ? `전시 등록 ${input.selfExhibitionCount}건`
          : "전시 등록",
      labelEn:
        input.selfExhibitionCount > 1
          ? `${input.selfExhibitionCount} exhibitions registered`
          : "Exhibition registered",
      points: pts,
      count: input.selfExhibitionCount,
    });
    summary.exhibition += pts;
  }

  if (input.ritualMomentCount > 0) {
    const capped = Math.min(input.ritualMomentCount, RITUAL_POINT_CAP);
    items.push({
      id: "ritual_moments",
      category: "ritual",
      labelKo: `작업 기록 ${capped}회`,
      labelEn: `${capped} practice sessions`,
      points: capped * RITUAL_POINT_EACH,
      count: capped,
    });
    summary.ritual += capped * RITUAL_POINT_EACH;
  }

  const streak = input.ritualStreak ?? 0;
  if (streak >= 30) {
    items.push({
      id: "streak_30",
      category: "ritual",
      labelKo: "30일 연속 기록",
      labelEn: "30-day practice streak",
      points: STREAK_BONUS_30,
    });
    summary.ritual += STREAK_BONUS_30;
  } else if (streak >= 7) {
    items.push({
      id: "streak_7",
      category: "ritual",
      labelKo: "7일 연속 기록",
      labelEn: "7-day practice streak",
      points: STREAK_BONUS_7,
    });
    summary.ritual += STREAK_BONUS_7;
  }

  const artworkCount = input.artworkCount ?? 0;
  if (artworkCount > 0) {
    const capped = Math.min(artworkCount, ARTWORK_POINT_CAP);
    items.push({
      id: "artworks",
      category: "artwork",
      labelKo: `작업 업로드 ${capped}개`,
      labelEn: `${capped} works uploaded`,
      points: capped * ARTWORK_POINT_EACH,
      count: capped,
    });
    summary.artwork += capped * ARTWORK_POINT_EACH;
  }

  const total = items.reduce((acc, i) => acc + i.points, 0);
  const levelInfo = getLevelInfo(total);
  const nextMilestone = getNextMilestone(total);

  return {
    total,
    level: levelInfo.level,
    levelLabelKo: levelInfo.ko,
    levelLabelEn: levelInfo.en,
    nextMilestone,
    progressToNext: progressBetween(total, nextMilestone),
    materialBenefitEligible: total >= MATERIAL_BENEFIT_THRESHOLD,
    items: items.sort((a, b) => b.points - a.points),
    summary,
  };
}

export function buildProfileCompletionData(profile: {
  name?: string | null;
  genre?: string | null;
  country?: string | null;
  city?: string | null;
  bio?: string | null;
  instagram?: string | null;
  website?: string | null;
  portfolioUrl?: string | null;
  profileImage?: string | null;
  workNote?: string | null;
}, counts: { seriesCount: number; artEventCount: number }): ProfileCompletionData {
  return {
    hasName: !!String(profile.name || "").trim(),
    hasProfileImage: !!String(profile.profileImage || "").trim(),
    hasGenre: !!String(profile.genre || "").trim(),
    hasLocation: !!String(profile.country || "").trim() && !!String(profile.city || "").trim(),
    hasBio: String(profile.bio || "").trim().length >= 20,
    hasSocialOrWebsite: !!(String(profile.instagram || "").trim() || String(profile.website || "").trim()),
    hasWorkNote: String(profile.workNote || "").trim().length >= 20,
    hasSeries: counts.seriesCount > 0,
    hasArtEvents: counts.artEventCount > 0,
    hasPortfolioUrl: !!String(profile.portfolioUrl || "").trim(),
  };
}
