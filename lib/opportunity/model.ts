export const OPPORTUNITY_TYPES = [
  "EXHIBITION",
  "RESIDENCY",
  "GRANT",
  "PRIZE",
  "PUBLIC_ART",
  "FAIR",
  "PROGRAM",
  "OTHER",
] as const;

export const OPPORTUNITY_STATUSES = ["OPEN", "CLOSED", "UNKNOWN", "WITHDRAWN"] as const;
export const VERIFICATION_STATUSES = [
  "VERIFIED_OFFICIAL",
  "VERIFIED_AGGREGATOR",
  "REVIEW_REQUIRED",
  "REJECTED",
] as const;
export const SOURCE_CLASSES = ["DIRECT", "REPRINT", "DIRECTORY", "INTERNAL"] as const;
export const ORGANIZER_TYPES = [
  "GALLERY",
  "MUSEUM",
  "ORGANIZATION",
  "GOVERNMENT",
  "AGGREGATOR",
] as const;
export const OPEN_CALL_CLASSES = [
  "VALID_INTERNAL",
  "VALID_EXTERNAL",
  "EXPIRED_VALID",
  "TEST_OR_DEMO",
  "SYNTHETIC_SEED",
  "INVALID",
  "UNKNOWN",
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type SourceClass = (typeof SOURCE_CLASSES)[number];
export type OrganizerType = (typeof ORGANIZER_TYPES)[number];
export type OpenCallClass = (typeof OPEN_CALL_CLASSES)[number];

export const BACKFILL_CLASSES: OpenCallClass[] = [
  "VALID_INTERNAL",
  "VALID_EXTERNAL",
  "EXPIRED_VALID",
];
