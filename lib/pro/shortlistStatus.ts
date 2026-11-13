export const SHORTLIST_STATUSES = ["REVIEW", "INTERESTED", "CONTACT_LATER", "PASSED"] as const;
export type ShortlistStatus = (typeof SHORTLIST_STATUSES)[number];
export const DEFAULT_SHORTLIST_STATUS: ShortlistStatus = "REVIEW";
export const NOTE_MAX_LENGTH = 5000;
export const NOTE_PREVIEW_LENGTH = 160;

export const STATUS_LABELS: Record<ShortlistStatus, string> = {
  REVIEW: "Review",
  INTERESTED: "Interested",
  CONTACT_LATER: "Contact later",
  PASSED: "Passed",
};

export function isShortlistStatus(value: unknown): value is ShortlistStatus {
  return typeof value === "string" && (SHORTLIST_STATUSES as readonly string[]).includes(value);
}
