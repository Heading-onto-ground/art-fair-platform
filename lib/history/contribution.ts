export const CLAIM_STATES = ["NONE", "PENDING", "APPROVED", "REJECTED"] as const;

export type ClaimViewStatus = (typeof CLAIM_STATES)[number];

const FIRST_PARTY_ORIGINS = ["ARTIST_SUBMITTED", "GALLERY_SUBMITTED", "INSTITUTION_SUBMITTED"] as const;

export function firstPartyOrigins(): readonly string[] {
  return FIRST_PARTY_ORIGINS;
}

/** Approved wins. A pending request blocks another claim. Rejected is the caller's own latest refusal. */
export function claimState(statuses: readonly string[]): ClaimViewStatus {
  if (statuses.includes("APPROVED")) return "APPROVED";
  if (statuses.includes("PENDING")) return "PENDING";
  if (statuses.includes("REJECTED")) return "REJECTED";
  return "NONE";
}

export function duplicateArtistDecision(matchCount: number): "create" | "existing" | "ambiguous" {
  if (matchCount <= 0) return "create";
  if (matchCount === 1) return "existing";
  return "ambiguous";
}
