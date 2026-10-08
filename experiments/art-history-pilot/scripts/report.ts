import { existsSync, mkdirSync, writeFileSync } from "fs";
import type { ExhibitionRecord } from "../src/claims";
import { readJson } from "../src/io";
import { recommend } from "../src/metrics";
import { pilotPath } from "../src/paths";
import { FROZEN_THRESHOLDS } from "../src/policy";
import type { SeedArtist } from "../src/seed";

function load<T>(relativePath: string, fallback: T): T {
  return existsSync(pilotPath(relativePath)) ? readJson<T>(relativePath) : fallback;
}

const seed = load<{ artists: SeedArtist[] }>("data/seed/artists.json", { artists: [] });
const claims = load<{ records: ExhibitionRecord[] }>("data/claims/exhibitions.json", { records: [] });
const allow = load<{ domains: { host: string; tier: number; mode: string }[]; held: { host: string; reason: string }[] }>(
  "data/policy/allowlist.json",
  { domains: [], held: [] },
);
const urls = load<{ urls: { url: string; reviewStatus: string; note?: string }[] }>("data/manifest/urls.json", {
  urls: [],
});
const er = load<{ wrongMergeRate?: number }>("checkpoints/ENTITY_RESOLUTION_FROZEN.json", {});
const accepted = claims.records.filter((record) => record.status === "AUTO_ACCEPTED");
const rejected = claims.records.filter((record) => record.status === "REJECTED");
const review = claims.records.filter((record) => record.status === "REVIEW_REQUIRED");

const decision = recommend({
  internationalMedian: null,
  domesticMedian: null,
  emergingMedian: null,
  quality: {
    cohortComplete: false,
    tier1Coverage: null,
    auditIncorrectRate: null,
    wrongMergeRate: er.wrongMergeRate ?? null,
    medianReviewMinutes: null,
  },
});

const lines = [
  "# ROB ART HISTORY GRAPH PILOT",
  "",
  "Status: INTERIM. Cohort A extraction has not been completed. Success thresholds were not applied.",
  "",
  "## 1. Frozen cohort composition",
  "",
  seed.artists.length === 100
    ? "100 artists are frozen: A01–A25 international, B01–B50 domestic institutional, C01–C25 emerging. Collectives and three historical estates are listed as exclusions in the seed file, not silently dropped."
    : "Seed is not frozen yet.",
  "",
  "## 2. Source allowlist",
  "",
  allow.domains.length
    ? allow.domains.map((domain) => `- ${domain.host} (tier ${domain.tier}, ${domain.mode})`).join("\n")
    : "No domain was approved for exhibition creation.",
  "",
  `Held or blocked after review: ${allow.held.length}.`,
  "",
  ...allow.held.map((domain) => `- ${domain.host}: ${domain.reason}`),
  "",
  "## 3. URLs reviewed",
  "",
  urls.urls.length
    ? urls.urls
        .map((url) => `- ${url.reviewStatus}: ${url.url}${url.note ? ` — ${url.note}` : ""}`)
        .join("\n")
    : "No URLs have been reviewed.",
  "",
  "## 4. Accepted exhibitions",
  "",
  String(accepted.length),
  "",
  "## 5. Rejected records",
  "",
  String(rejected.length),
  review.length ? `Review queue: ${review.length}.` : "Review queue: 0.",
  "",
  "## 6. Cohort scorecard",
  "",
  "Not evaluated. The fixed thresholds remain international median >= 8, domestic >= 4, emerging >= 2, Tier 1 coverage >= 70%, audit incorrect rate < 15%, wrong-merge rate < 2%. An empty graph is not a failed cohort.",
  "",
  "## 7. Entity-resolution results",
  "",
  `Frozen 20-pair wrong-merge rate: ${er.wrongMergeRate ?? "not frozen"}. HIGH_CONFIDENCE_CANDIDATE does not merge without human approval.`,
  "",
  `Identity status: ${seed.artists.filter((artist) => artist.identityStatus === "QID_CONFIRMED").length} confirmed, ${seed.artists.filter((artist) => artist.identityStatus === "QID_AMBIGUOUS").length} ambiguous, ${seed.artists.filter((artist) => artist.identityStatus === "QID_UNRESOLVED").length} unresolved. Wikidata's API path is disallowed by robots.txt for a generic agent, so QIDs were not collected.`,
  "",
  "## 8. 50-record factual audit",
  "",
  "Not run. There are not 50 accepted exhibition records.",
  "",
  "## 9. Human review cost",
  "",
  "Not measured. No exhibition review session has been logged.",
  "",
  "## 10. Emerging-artist result",
  "",
  "Not run. The stop rule (median < 1) is unchanged and has not been applied.",
  "",
  "## 11. Five timeline prototypes",
  "",
  "The English history shell is at view/index.html. It does not invent five artist histories. Suggestions search the frozen seed. A timeline appears only for an accepted Tier 1 record.",
  "",
  "## 12. Major failure modes",
  "",
  "The binding constraint so far is source permission, not parser cleverness. Domains whose terms do not grant reuse stay off the allowlist. Entity resolution refuses to treat a shared name and birth year as identity.",
  "",
  "## 13. Final recommendation",
  "",
  decision.recommendation,
  "",
  "## 14. Evidence for recommendation",
  "",
  "INCOMPLETE means the three-way product decision is not available. Accepted exhibitions are below the point where a median, a 50-record audit, or the emerging stop rule would mean anything. Thresholds in code are still " +
    `${FROZEN_THRESHOLDS.internationalMedianExhibitions} / ${FROZEN_THRESHOLDS.domesticMedianExhibitions} / ${FROZEN_THRESHOLDS.emergingMedianExhibitions}.`,
  "",
  "## 15. What production ROB should do next",
  "",
  "Leave the production app, Prisma schema, and Phase 1-A through 1-C untouched. Do not start Phase 1-D. Do not migrate this pilot. Next research step: clear at least one Tier 1 domain, select Cohort A URLs by hand, and extract only spans that appear on those pages.",
  "",
  "## Appendix: fixed cost signals in the repo",
  "",
  "Dollar amounts are not in the repository. The deployed app is a Next.js project on Vercel with Postgres (`DATABASE_URL`), Vercel Blob (`BLOB_READ_WRITE_TOKEN`), Resend email, and an optional OpenAI key. `vercel.json` schedules gallery crawling every 2 hours and several daily email crons (outreach, digest, onboarding, retention). During this pilot those jobs can keep spending while the history experiment does not use them. Pausing nonessential crons would be a production change and was not done here.",
  "",
];

mkdirSync(pilotPath("reports"), { recursive: true });
writeFileSync(pilotPath("reports/INTERIM_CANARY.md"), lines.join("\n"), "utf8");
console.log(pilotPath("reports/INTERIM_CANARY.md"));
