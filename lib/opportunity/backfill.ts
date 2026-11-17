import { classifyOpenCall, draftOpportunity, type LegacyOpenCallInput, type OpportunityDraft } from "@/lib/opportunity/fromOpenCall";
import type { OpenCallClass } from "@/lib/opportunity/model";

export type StoredOpportunity = {
  id: string;
  fingerprint: string;
  cycleKey: string | null;
  legacyOpenCallId: string | null;
  verificationStatus: string;
};

export type OpportunityWriteStore = {
  findByLegacyOpenCallId(id: string): Promise<StoredOpportunity | null>;
  findByFingerprint(fingerprint: string): Promise<StoredOpportunity | null>;
  findByCycleKey(cycleKey: string): Promise<StoredOpportunity | null>;
  insert(draft: OpportunityDraft): Promise<StoredOpportunity>;
  ensureSource(opportunityId: string, draft: OpportunityDraft): Promise<void>;
};

export type BackfillResult = {
  inserted: number;
  linked: number;
  skipped: number;
  reviewRequired: number;
  byClass: Record<OpenCallClass, number>;
};

function emptyClasses(): Record<OpenCallClass, number> {
  return {
    VALID_INTERNAL: 0,
    VALID_EXTERNAL: 0,
    EXPIRED_VALID: 0,
    TEST_OR_DEMO: 0,
    SYNTHETIC_SEED: 0,
    INVALID: 0,
    UNKNOWN: 0,
  };
}

export async function backfillOpportunities(
  calls: LegacyOpenCallInput[],
  store: OpportunityWriteStore,
  now = new Date(),
): Promise<BackfillResult> {
  const result: BackfillResult = {
    inserted: 0,
    linked: 0,
    skipped: 0,
    reviewRequired: 0,
    byClass: emptyClasses(),
  };
  for (const call of calls) {
    const classification = classifyOpenCall(call, now);
    result.byClass[classification] += 1;
    const draft = draftOpportunity(call, now);
    if (!draft) {
      result.skipped += 1;
      continue;
    }
    const existing = await store.findByLegacyOpenCallId(call.id)
      || await store.findByFingerprint(draft.fingerprint)
      || (draft.cycleKey ? await store.findByCycleKey(draft.cycleKey) : null);
    if (existing) {
      await store.ensureSource(existing.id, draft);
      result.linked += 1;
      continue;
    }
    const created = await store.insert(draft);
    await store.ensureSource(created.id, draft);
    result.inserted += 1;
    if (draft.verificationStatus === "REVIEW_REQUIRED") result.reviewRequired += 1;
  }
  return result;
}
