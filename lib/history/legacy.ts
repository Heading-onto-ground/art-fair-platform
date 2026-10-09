export function legacyPublicationPlan(input: {
  isPublic: boolean;
  createdByProfileId: string | null;
  creatorProfileExists: boolean;
  crawlerWritten: boolean;
}): null | {
  origin: "LEGACY_FIRST_PARTY";
  publicationStatus: "PUBLIC";
  sourceClearance: "NOT_APPLICABLE";
  contributorKind: "artist";
  clearanceStatus: "REVIEW_REQUIRED";
} {
  if (!input.isPublic || input.crawlerWritten || !input.createdByProfileId || !input.creatorProfileExists) return null;
  return {
    origin: "LEGACY_FIRST_PARTY",
    publicationStatus: "PUBLIC",
    sourceClearance: "NOT_APPLICABLE",
    contributorKind: "artist",
    clearanceStatus: "REVIEW_REQUIRED",
  };
}

export function legacyDateParts(date: Date | null): {
  precision: "DAY" | "YEAR" | "UNKNOWN";
  year: number | null;
  month: number | null;
  day: number | null;
} {
  if (!date || Number.isNaN(date.getTime())) return { precision: "UNKNOWN", year: null, month: null, day: null };
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (month === 1 && day === 1) return { precision: "YEAR", year, month: null, day: null };
  return { precision: "DAY", year, month, day };
}

export function mapConfirmedParticipation(input: { legacyPublic: boolean; status: string; entityId: string | null }): string | null {
  if (!input.legacyPublic || input.status !== "confirmed" || !input.entityId) return null;
  return input.entityId;
}
