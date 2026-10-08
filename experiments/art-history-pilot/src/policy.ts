export type SourceTier = 0 | 1 | 2;

export type CollectionMode =
  | "identity_api"
  | "fact_extract_automated"
  | "corroboration_only"
  | "hold"
  | "blocked";

export type PolicyDecision = {
  mode: CollectionMode;
  approved: boolean;
  reason: string;
};

const FORBIDDEN = [
  "without prior permission",
  "prior written consent",
  "no scraping",
  "scraping is prohibited",
  "may not be used without",
  "무단",
  "사전 허락",
  "사전 승인",
  "automated means",
];

const OPEN_LICENSE = ["cc0", "public domain", "creativecommons.org/publicdomain/zero"];
const CONDITIONAL_OPEN = ["공공누리", "kogl"];

export function decideReuse(input: {
  tier: SourceTier;
  robotsAllowTarget: boolean;
  termsText: string | null;
}): PolicyDecision {
  const terms = (input.termsText ?? "").toLowerCase();
  const open = OPEN_LICENSE.some((phrase) => terms.includes(phrase));
  const conditional = CONDITIONAL_OPEN.some((phrase) => terms.includes(phrase));
  const forbidden = FORBIDDEN.some((phrase) => terms.includes(phrase.toLowerCase()));
  if (!input.robotsAllowTarget) {
    return { mode: "blocked", approved: false, reason: "robots_disallow_target" };
  }
  if (conditional && !open) {
    return {
      mode: "hold",
      approved: false,
      reason: "open_license_is_per_item_not_sitewide",
    };
  }
  if (input.tier === 0 && open && !forbidden) {
    return {
      mode: "identity_api",
      approved: true,
      reason: "open_identity_license",
    };
  }
  if (forbidden) {
    return { mode: "blocked", approved: false, reason: "explicit_permission_required" };
  }
  if (!input.termsText) {
    return { mode: "hold", approved: false, reason: "terms_not_located" };
  }
  if (!open) {
    return { mode: "hold", approved: false, reason: "reuse_not_explicitly_granted" };
  }
  if (input.tier === 2) {
    return {
      mode: "corroboration_only",
      approved: true,
      reason: "open_license_corroboration_only",
    };
  }
  return {
    mode: "fact_extract_automated",
    approved: true,
    reason: "open_license_and_robots_allow",
  };
}

export const FROZEN_THRESHOLDS = {
  internationalMedianExhibitions: 8,
  domesticMedianExhibitions: 4,
  emergingMedianExhibitions: 2,
  tier1CoverageMin: 0.7,
  auditSampleSize: 50,
  auditMaxIncorrectRate: 0.15,
  entityPairCount: 20,
  entityMaxWrongMergeRate: 0.02,
  maxMedianReviewMinutes: 45,
  emergingStopMedian: 1,
} as const;
