import { config } from "dotenv";
import { readFileSync } from "fs";
import { betaSeedDecision, median, publicBetaDecision } from "../lib/history/policy";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function databaseTarget(): string {
  const raw = process.env.DATABASE_URL || "";
  try {
    const url = new URL(raw);
    const host = url.hostname;
    const family = /supabase/i.test(host) ? "supabase" : /neon/i.test(host) ? "neon" : host === "localhost" || host === "127.0.0.1" ? "localhost" : "other";
    const pooler = /pooler|pool/i.test(host) ? "pooler" : "direct";
    return `${family} ${pooler} port ${url.port || "default"} database ${url.pathname.replace(/^\//, "") || "unknown"}`;
  } catch {
    return "unparsed";
  }
}

function clearanceSeedReady(): boolean {
  try {
    const file = JSON.parse(readFileSync("data/production-clearance/source-review.json", "utf8")) as {
      sources?: { reviewDecision?: string }[];
    };
    return Array.isArray(file.sources) && file.sources.some((source) => source.reviewDecision === "APPROVED");
  } catch {
    return false;
  }
}

function printNotQueried(decision: string) {
  console.log(decision);
  console.log(`database target: ${databaseTarget()}`);
  console.log("database identity: DATABASE_TARGET_UNCONFIRMED");
  console.log("recovery: DATABASE_RECOVERY_UNCONFIRMED");
  console.log("public artists: not queried");
  console.log("public records: not queried");
  console.log("artists >=1 / >=3 / >=8 / >=12: not queried");
  console.log("official-source records: not queried");
  console.log("artist-added records: not queried");
  console.log("gallery-added records: not queried");
  console.log("institution-added records: not queried");
  console.log("legacy first-party records: not queried");
  console.log("conflict/review records: not queried");
  console.log("SEO EMPTY / LOW_DENSITY / HISTORY_READY / RICH_HISTORY: not queried");
  console.log("graph bridge paths: not queried");
  console.log("spaces with exhibitions: not queried");
  console.log("Pilot records were not read and were not imported.");
}

async function main() {
  const databaseConfirmed = process.env.ROB_CONFIRM_DATABASE === "1";
  const recoveryConfirmed = process.env.ROB_CONFIRM_RECOVERY === "1";
  if (!databaseConfirmed || !recoveryConfirmed) {
    printNotQueried("PUBLIC_BETA_DATABASE_GATE_BLOCKED");
    process.exit(2);
  }
  const { contentGateCounts } = await import("../lib/history/queries");
  const { prisma } = await import("../lib/prisma");
  const counts = await contentGateCounts();
  const seed = betaSeedDecision(counts);
  const decision = publicBetaDecision({
    databaseConfirmed,
    recoveryConfirmed,
    seed,
    clearanceSeedReady: clearanceSeedReady(),
  });
  console.log(decision);
  console.log(`database target: ${databaseTarget()}`);
  console.log(`public artists: ${counts.publicArtists}`);
  console.log(`public records: ${counts.publicRecords}`);
  console.log(`artists >=1: ${counts.artistsAtLeast1}`);
  console.log(`artists >=3: ${counts.artistsAtLeast3}`);
  console.log(`artists >=8: ${counts.artistsAtLeast8}`);
  console.log(`artists >=12: ${counts.artistsAtLeast12}`);
  console.log(`official-source records: ${counts.officialSource}`);
  console.log(`artist-added records: ${counts.artistAdded}`);
  console.log(`gallery-added records: ${counts.galleryAdded}`);
  console.log(`institution-added records: ${counts.institutionAdded}`);
  console.log(`legacy first-party records: ${counts.legacyFirstParty}`);
  console.log(`conflict/review records: ${counts.conflictReview}`);
  console.log(`SEO EMPTY: ${counts.empty}`);
  console.log(`SEO LOW_DENSITY: ${counts.lowDensity}`);
  console.log(`SEO HISTORY_READY: ${counts.historyReady}`);
  console.log(`SEO RICH_HISTORY: ${counts.rich}`);
  console.log(`median exhibitions among index-eligible artists: ${median(counts.indexCounts) ?? "none"}`);
  console.log(`graph bridge artists: ${counts.bridgeArtists}`);
  console.log(`graph bridge paths: ${counts.bridgePaths}`);
  console.log(`spaces with exhibitions: ${counts.spacesWithExhibitions}`);
  await prisma.$disconnect();
  process.exit(decision === "PUBLIC_BETA_FIRST_PARTY_SEED_READY" || decision === "PUBLIC_BETA_CLEARANCE_SEED_READY" ? 0 : 2);
}

main().catch((error) => {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
  console.error(`content gate query failed: ${code}`);
  process.exit(1);
});
