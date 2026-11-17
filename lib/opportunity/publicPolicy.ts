import type { OpportunityStatus, VerificationStatus } from "@/lib/opportunity/model";

export function isPublicOpportunity(input: {
  status: OpportunityStatus | string;
  verificationStatus: VerificationStatus | string;
}) {
  const verified = input.verificationStatus === "VERIFIED_OFFICIAL"
    || input.verificationStatus === "VERIFIED_AGGREGATOR";
  return input.status === "OPEN" && verified;
}
