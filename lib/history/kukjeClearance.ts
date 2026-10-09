import { selectiveImportDecision } from "@/lib/history/policy";

export type KukjeClearanceDecision = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";

export function kukjeClearanceDecision(input: {
  explicitReuseLicense: boolean;
  writtenPermission: boolean;
  reviewedPolicyCoversUse: boolean;
  explicitMetadataProhibition: boolean;
}): KukjeClearanceDecision {
  if (input.explicitMetadataProhibition) return "REJECTED";
  if (input.explicitReuseLicense || input.writtenPermission || input.reviewedPolicyCoversUse) return "APPROVED";
  return "REVIEW_REQUIRED";
}

export function mayImportClearedRecord(input: {
  decision: KukjeClearanceDecision;
  recordId: string;
  approvedIds: string[];
}): { ok: boolean; reason: string } {
  return selectiveImportDecision({
    reviewDecision: input.decision,
    requestedIds: [input.recordId],
    approvedIds: input.approvedIds,
  });
}

export function displayedProductionCount(clearedIds: string[]): number {
  return new Set(clearedIds).size;
}

export function explicitParticipants(names: string[], evidence: string): string[] {
  const span = evidence.normalize("NFKC").toLowerCase();
  return names.filter((name) => span.includes(name.normalize("NFKC").toLowerCase()));
}

export function dossierHasProductionImage(value: string): boolean {
  return /\/upload\/artworks\//i.test(value) || /https?:\/\/[^\s"]+\.(?:jpg|jpeg|png|gif|webp)\b/i.test(value);
}
