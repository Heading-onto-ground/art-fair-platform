import { existsSync } from "fs";
import { ER_PAIRS } from "../src/erPairs";
import { sha256, stableStringify } from "../src/hash";
import { readJson, writeJson } from "../src/io";
import { pilotPath } from "../src/paths";
import { FROZEN_THRESHOLDS } from "../src/policy";
import { classifyPair, decideMerge } from "../src/resolve";
import { EXCLUSIONS, buildSeedArtists, validateSeed, type IdentityStatus, type SeedArtist } from "../src/seed";
import { wrongMergeRate } from "../src/metrics";

type LookupFile = {
  retrievedAt: string;
  lookup: {
    pilotId: string;
    status: "UNIQUE" | "AMBIGUOUS" | "UNRESOLVED";
    qid: string | null;
    birthYear: number | null;
  }[];
};

type ReviewFile = {
  reviews: {
    host: string;
    tier: 0 | 1 | 2;
    category: string;
    approved: boolean;
    mode: string;
    reason: string;
    reviewedAt: string;
    robotsAllowTarget: boolean;
    matchedSentence: string | null;
  }[];
};

const pairs = ER_PAIRS.map((pair) => {
  const state = classifyPair(pair.left, pair.right);
  const decision = decideMerge(state, false);
  return { expectedAutoMerge: pair.expectedAutoMerge, merged: decision.merge, state, expected: pair.expectedState };
});
if (pairs.some((pair) => pair.state !== pair.expected)) {
  throw new Error("Entity-resolution pairs no longer match the frozen expectations.");
}

const lookupPath = pilotPath("data/review/identity-lookup.json");
const identityBlocked = !existsSync(lookupPath);
const reviewPath = pilotPath("data/policy/domain-reviews.json");
if (!existsSync(reviewPath)) throw new Error("Run review-domains.ts before freezing source policy.");

const rejects = new Set<string>(
  existsSync(pilotPath("data/review/qid-rejects.json"))
    ? readJson<string[]>("data/review/qid-rejects.json")
    : [],
);
const lookup = identityBlocked ? null : readJson<LookupFile>("data/review/identity-lookup.json");
const byId = new Map((lookup?.lookup ?? []).map((row) => [row.pilotId, row]));

const artists: SeedArtist[] = buildSeedArtists().map((artist) => {
  const row = byId.get(artist.pilotId);
  let identityStatus: IdentityStatus = "QID_UNRESOLVED";
  let wikidataQid: string | null = null;
  let birthYear: number | null = null;
  if (row && !rejects.has(artist.pilotId) && row.status === "UNIQUE" && row.qid) {
    identityStatus = "QID_CONFIRMED";
    wikidataQid = row.qid;
    birthYear = row.birthYear;
  } else if (row?.status === "AMBIGUOUS" && !rejects.has(artist.pilotId)) {
    identityStatus = "QID_AMBIGUOUS";
  }
  return { ...artist, identityStatus, wikidataQid, birthYear };
});

const seedErrors = validateSeed(artists);
if (seedErrors.length > 0) {
  console.error(seedErrors.slice(0, 20).join("\n"));
  throw new Error(`Seed failed validation (${seedErrors.length}).`);
}

const seed = {
  status: "FROZEN",
  frozenAt: new Date().toISOString(),
  rules: {
    cohorts: "25 international / 50 domestic institutional / 25 emerging",
    emerging:
      "24th SongEun 본선 참여 individuals, collective removed, then winner 탁영준, then the first six names in the 23rd 참여작가 sentence.",
    identity: identityBlocked
      ? "Wikidata structured data is CC0, but robots.txt Disallow: /w/ blocks /w/api.php for a generic agent. No QIDs were stored."
      : "A Wikidata QID is stored only for a unique artist-description match. It is not exhibition evidence.",
    merge: "During this pilot, canonical merge requires the same authoritative id or an explicit human approval. HIGH_CONFIDENCE_CANDIDATE does not merge.",
  },
  exclusions: EXCLUSIONS,
  artists,
};
writeJson("data/seed/artists.json", seed);

const reviews = readJson<ReviewFile>("data/policy/domain-reviews.json");
const allowlist = {
  frozenAt: new Date().toISOString(),
  rule: "A domain is listed here only after this run's robots and terms review approved it. Appearing in the brief is not approval.",
  domains: reviews.reviews.filter((review) => review.approved),
  held: reviews.reviews.filter((review) => !review.approved).map((review) => ({
    host: review.host,
    tier: review.tier,
    mode: review.mode,
    reason: review.reason,
  })),
};
writeJson("data/policy/allowlist.json", allowlist);
if (!existsSync(pilotPath("data/manifest/urls.json"))) {
  writeJson("data/manifest/urls.json", {
    rule: "Human-selected URLs only. Do not add a URL that was not opened or returned by a source review.",
    urls: [],
  });
}
writeJson("data/claims/exhibitions.json", { records: [] });
writeJson("data/review/queue.json", { items: [] });
writeJson("data/review/time-log.json", { entries: [] });

writeJson("checkpoints/SEED_FROZEN.json", {
  checkpoint: "SEED_FROZEN",
  frozenAt: seed.frozenAt,
  artistCount: artists.length,
  hash: sha256(stableStringify(artists)),
  qidConfirmed: artists.filter((artist) => artist.identityStatus === "QID_CONFIRMED").length,
  qidAmbiguous: artists.filter((artist) => artist.identityStatus === "QID_AMBIGUOUS").length,
  qidUnresolved: artists.filter((artist) => artist.identityStatus === "QID_UNRESOLVED").length,
  identityLookup: identityBlocked ? "not_run_robots_disallow_/w/api.php" : "applied",
});
writeJson("checkpoints/SOURCE_POLICY_FROZEN.json", {
  checkpoint: "SOURCE_POLICY_FROZEN",
  frozenAt: allowlist.frozenAt,
  approved: allowlist.domains.map((domain) => domain.host),
  held: allowlist.held.length,
  hash: sha256(stableStringify(allowlist.domains)),
});
writeJson("checkpoints/ENTITY_RESOLUTION_FROZEN.json", {
  checkpoint: "ENTITY_RESOLUTION_FROZEN",
  pairCount: ER_PAIRS.length,
  wrongMergeRate: wrongMergeRate(pairs),
  thresholds: FROZEN_THRESHOLDS,
  hash: sha256(stableStringify(ER_PAIRS)),
});

console.log(`seed ${artists.length}; approved domains ${allowlist.domains.length}; held ${allowlist.held.length}`);
