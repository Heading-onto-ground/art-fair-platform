import { prisma } from "@/lib/prisma";
import type { OpportunityWriteStore, StoredOpportunity } from "@/lib/opportunity/backfill";
import type { OpportunityDraft } from "@/lib/opportunity/fromOpenCall";
import { opportunityCycleKey } from "@/lib/opportunity/fingerprint";

function toStored(row: {
  id: string;
  fingerprint: string;
  organizerName: string | null;
  title: string;
  deadline: string | null;
  legacyOpenCallId: string | null;
  verificationStatus: string;
}): StoredOpportunity {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    cycleKey: opportunityCycleKey(row),
    legacyOpenCallId: row.legacyOpenCallId,
    verificationStatus: row.verificationStatus,
  };
}

export function prismaOpportunityStore(): OpportunityWriteStore {
  return {
    async findByLegacyOpenCallId(id) {
      const direct = await prisma.opportunity.findUnique({ where: { legacyOpenCallId: id } });
      if (direct) return toStored(direct);
      const source = await prisma.opportunitySource.findUnique({
        where: { legacyOpenCallId: id },
        include: { opportunity: true },
      });
      return source ? toStored(source.opportunity) : null;
    },
    async findByFingerprint(fingerprint) {
      const row = await prisma.opportunity.findUnique({ where: { fingerprint } });
      return row ? toStored(row) : null;
    },
    async findByCycleKey(cycleKey) {
      const rows = await prisma.opportunity.findMany({
        where: { organizerName: { not: null } },
      });
      const match = rows.find((row: {
        organizerName: string | null;
        title: string;
        deadline: string | null;
      }) => opportunityCycleKey(row) === cycleKey);
      return match ? toStored(match) : null;
    },
    async insert(draft: OpportunityDraft) {
      const row = await prisma.opportunity.create({
        data: {
          type: draft.type,
          title: draft.title,
          organizerName: draft.organizerName,
          organizerType: draft.organizerType,
          country: draft.country,
          city: draft.city,
          locationText: draft.locationText,
          deadline: draft.deadline,
          deadlineTimezone: draft.deadlineTimezone,
          applicationStart: draft.applicationStart,
          eventStart: draft.eventStart,
          eventEnd: draft.eventEnd,
          feeAmount: draft.feeAmount,
          feeCurrency: draft.feeCurrency,
          feeRequired: draft.feeRequired,
          eligibility: draft.eligibility,
          disciplines: draft.disciplines,
          internationalEligible: draft.internationalEligible,
          description: draft.description,
          officialUrl: draft.officialUrl,
          sourceUrl: draft.sourceUrl,
          sourceHost: draft.sourceHost,
          sourceLanguage: draft.sourceLanguage,
          sourceClass: draft.sourceClass,
          status: draft.status,
          verificationStatus: draft.verificationStatus,
          verifiedAt: draft.verificationStatus.startsWith("VERIFIED_") ? new Date() : null,
          discoveredAt: draft.discoveredAt,
          fingerprint: draft.fingerprint,
          legacyOpenCallId: draft.legacyOpenCallId,
        },
      });
      return toStored(row);
    },
    async ensureSource(opportunityId, draft) {
      if (!draft.sourceUrl) return;
      await prisma.opportunitySource.upsert({
        where: {
          opportunityId_sourceUrl: { opportunityId, sourceUrl: draft.sourceUrl },
        },
        create: {
          opportunityId,
          sourceUrl: draft.sourceUrl,
          sourceHost: draft.sourceHost,
          sourceLanguage: draft.sourceLanguage,
          sourceClass: draft.sourceClass,
          discoveredAt: draft.discoveredAt ?? new Date(),
          legacyOpenCallId: draft.legacyOpenCallId,
        },
        update: {},
      });
    },
  };
}
