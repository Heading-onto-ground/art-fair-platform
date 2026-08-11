/** Structured answers for the artist labor & contract survey. */
export type LaborSurveyAnswers = {
  /** 작가명 (본명 대신) */
  artistDisplayName: string;
  /** 인스타그램 아이디 (@ 없이 또는 포함 모두 가능) */
  instagramId: string;

  // A. 활동 현황
  field: string;
  careerYears: string;
  employmentType: string;
  isFreelancer: "yes" | "no" | "mixed";
  activityForms: string;

  // B. 계약 경험
  hasWrittenContract: "always" | "sometimes" | "rarely" | "never";
  contractTiming: "before" | "after" | "mixed" | "none";
  noContractReceived: "yes" | "no";
  verbalThenWritten: "yes" | "no";
  payCutOrDelay: "yes" | "no";

  // C. 문제 제기 경험
  responseToUnfair: string;
  hardToAskContract: "yes" | "no";
  hardToAskContractReason: string;
  fearRetaliation: "yes" | "no";

  // D. 핵심 서술형
  laborExperience: string;
};

export type LaborSurveyConsent = {
  consentResearch: boolean;
  consentPolicy: boolean;
  consentNationalAssembly: boolean;
  consentAnonymousCase: boolean;
  declineNationalAssembly: boolean;
};

export type LaborSurveyCampaignPublic = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  isActive: boolean;
  opensAt: number | null;
  closesAt: number | null;
};

export type LaborSurveyAggregateItem = {
  key: string;
  label: string;
  yesCount: number;
  total: number;
  percent: number | null;
};

export type LaborSurveyAggregate = {
  campaignId: string;
  title: string;
  responseCount: number;
  items: LaborSurveyAggregateItem[];
};

/** Boolean-ish fields aggregated as yes/total percentages for live display. */
export const AGGREGATE_FIELDS: Array<{ key: keyof LaborSurveyAnswers; label: string; yesValues: string[] }> = [
  { key: "noContractReceived", label: "계약 없이 일을 시작한 경험이 있다", yesValues: ["yes"] },
  { key: "hardToAskContract", label: "계약서를 요구하기 어려웠던 적이 있다", yesValues: ["yes"] },
  { key: "fearRetaliation", label: "문제를 제기하면 다음 일이 끊길까 걱정했다", yesValues: ["yes"] },
  { key: "verbalThenWritten", label: "구두 계약 후 사후에 서면 계약한 경험이 있다", yesValues: ["yes"] },
  { key: "payCutOrDelay", label: "보수 삭감·지연을 경험했다", yesValues: ["yes"] },
  { key: "isFreelancer", label: "프리랜서(독립 활동) 형태로 일한다", yesValues: ["yes", "mixed"] },
];

export const DEFAULT_CAMPAIGN = {
  title: "예술인 솔직담백 수다회",
  subtitle: "예술은 노동이 아닐까요?",
  description:
    "예술인의 노동환경 및 계약실태를 청취하기 위한 사전 설문입니다. 응답은 익명으로 집계되며, 연구·정책·국정감사 자료로 활용될 수 있습니다.",
};

export const FIELD_OPTIONS = [
  "시각예술",
  "공연/연극",
  "음악",
  "문학",
  "영상/미디어",
  "무용",
  "디자인/공예",
  "기타",
];

export const CAREER_OPTIONS = ["1년 미만", "1–3년", "3–5년", "5–10년", "10년 이상"];

export const EMPLOYMENT_OPTIONS = ["전업 예술가", "겸업(다른 일 병행)", "학생/교육 중", "기타"];

export const CONTRACT_FREQ_OPTIONS = [
  { value: "always", label: "항상 서면 계약" },
  { value: "sometimes", label: "가끔 서면 계약" },
  { value: "rarely", label: "거의 없음" },
  { value: "never", label: "서면 계약 없음" },
];

export const CONTRACT_TIMING_OPTIONS = [
  { value: "before", label: "작업 시작 전" },
  { value: "after", label: "작업 후·완료 후" },
  { value: "mixed", label: "경우마다 다름" },
  { value: "none", label: "계약 경험 없음" },
];

export function emptyLaborSurveyAnswers(): LaborSurveyAnswers {
  return {
    artistDisplayName: "",
    instagramId: "",
    field: "",
    careerYears: "",
    employmentType: "",
    isFreelancer: "no",
    activityForms: "",
    hasWrittenContract: "sometimes",
    contractTiming: "mixed",
    noContractReceived: "no",
    verbalThenWritten: "no",
    payCutOrDelay: "no",
    responseToUnfair: "",
    hardToAskContract: "no",
    hardToAskContractReason: "",
    fearRetaliation: "no",
    laborExperience: "",
  };
}
