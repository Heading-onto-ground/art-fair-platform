import { mayAutoTrustHost, reviewDiscoveredHost, type DomainReviewState } from "@/lib/history/sourceDiscovery";

/**
 * A host that looks official but is not in the trusted crawler list.
 * These records never grant crawl or publication permission.
 */
export type OfficialCandidateReview = {
  host: string;
  state: Extract<DomainReviewState, "OFFICIAL_CANDIDATE" | "NEEDS_REVIEW">;
  trusted: false;
  reviewedAt: string;
  owner: string;
  publicAccess: string;
  urlStability: string;
  chronology: string;
  factualMetadata: string;
  boundedCrawl: string;
  robots: string;
  decision: "HOLD";
  reason: string;
};

export const OFFICIAL_CANDIDATE_REVIEWS: readonly OfficialCandidateReview[] = [
  {
    host: "kawsone.com",
    state: "OFFICIAL_CANDIDATE",
    trusted: false,
    reviewedAt: "2026-11-06",
    owner: "Shopify storefront. Homepage presents a shop, mailing list, orders, and FAQ. It does not identify an exhibition archive.",
    publicAccess: "Homepage HTML is public. Account, cart, and checkout are disallowed.",
    urlStability: "Shopify product and collection URLs. No stable artist-chronology path was identified.",
    chronology: "No factual exhibition chronology was visible on the public homepage.",
    factualMetadata: "The visible page is commerce copy, not exhibition metadata ROB can retain.",
    boundedCrawl: "A product catalog crawl would not be bounded to factual exhibition records.",
    robots: "robots.txt allows public storefront HTML and disallows checkout, cart, orders, and admin. It also points agents at shopping tools. That permission is for the shop, not for ROB exhibition provenance.",
    decision: "HOLD",
    reason: "Official-looking shop host stays untrusted. No artist-specific parser is added.",
  },
];

export function officialCandidateReview(host: string): OfficialCandidateReview | null {
  const key = host.toLowerCase().replace(/^www\./, "");
  return OFFICIAL_CANDIDATE_REVIEWS.find((review) => review.host === key) ?? null;
}

export function reviewAllowsCrawl(host: string): false {
  const review = officialCandidateReview(host);
  if (review) return false;
  return mayAutoTrustHost();
}

export function kawsoneReviewState(): DomainReviewState {
  return reviewDiscoveredHost("kawsone.com").state;
}
