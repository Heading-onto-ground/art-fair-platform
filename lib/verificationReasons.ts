export const VERIFICATION_REVIEW_REASON_KEYS = [
  "insufficient_public_evidence",
  "identity_mismatch",
  "portfolio_quality_incomplete",
  "broken_or_unverifiable_links",
  "policy_or_safety_risk",
] as const;

export type VerificationReviewReasonKey = (typeof VERIFICATION_REVIEW_REASON_KEYS)[number];

type ReasonDef = {
  titleEn: string;
  titleKo: string;
  guidanceEn: string;
  guidanceKo: string;
};

const REASONS: Record<VerificationReviewReasonKey, ReasonDef> = {
  insufficient_public_evidence: {
    titleEn: "Not enough public evidence",
    titleKo: "공개 근거 부족",
    guidanceEn:
      "Add verifiable public activity links (exhibitions, publications, official notices) and resubmit.",
    guidanceKo: "검증 가능한 공개 활동 링크(전시, 보도, 기관 공지 등)를 보강한 뒤 다시 요청해 주세요.",
  },
  identity_mismatch: {
    titleEn: "Identity mismatch across submitted links",
    titleKo: "제출 정보 간 신원 불일치",
    guidanceEn:
      "Ensure your profile name and submitted links point to the same person/artist identity, then resubmit.",
    guidanceKo: "프로필 이름과 제출 링크의 주체가 동일 인물인지 정리한 뒤 다시 요청해 주세요.",
  },
  portfolio_quality_incomplete: {
    titleEn: "Portfolio/profile is incomplete",
    titleKo: "포트폴리오/프로필 정보 부족",
    guidanceEn:
      "Complete core profile fields and include stronger portfolio context (statement, works, recent activity).",
    guidanceKo: "핵심 프로필과 포트폴리오 정보를 보완하고 작업 맥락(노트/작품/최근 활동)을 추가해 주세요.",
  },
  broken_or_unverifiable_links: {
    titleEn: "Submitted links are inaccessible or unverifiable",
    titleKo: "제출 링크 접근 불가 또는 검증 불가",
    guidanceEn:
      "Replace broken/private links with accessible links that third parties can verify without private access.",
    guidanceKo: "비공개/오류 링크 대신 외부에서 확인 가능한 공개 링크로 교체해 주세요.",
  },
  policy_or_safety_risk: {
    titleEn: "Policy or safety risk",
    titleKo: "정책/안전 기준 이슈",
    guidanceEn:
      "The current submission conflicts with platform policy or safety standards. Update and request review again.",
    guidanceKo: "현재 제출 내용이 플랫폼 정책/안전 기준과 충돌합니다. 보완 후 재요청해 주세요.",
  },
};

export function isVerificationReviewReasonKey(
  v: string | null | undefined,
): v is VerificationReviewReasonKey {
  return VERIFICATION_REVIEW_REASON_KEYS.includes(v as VerificationReviewReasonKey);
}

export function getVerificationReasonTitle(
  key: VerificationReviewReasonKey,
  lang: "en" | "ko" = "en",
): string {
  const r = REASONS[key];
  return lang === "ko" ? r.titleKo : r.titleEn;
}

export function getVerificationReasonGuidance(
  key: VerificationReviewReasonKey,
  lang: "en" | "ko" = "en",
): string {
  const r = REASONS[key];
  return lang === "ko" ? r.guidanceKo : r.guidanceEn;
}

export function getVerificationReasonOptions() {
  return VERIFICATION_REVIEW_REASON_KEYS.map((key) => ({ key, ...REASONS[key] }));
}
