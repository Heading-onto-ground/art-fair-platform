import { contentGateDecision, median } from "../lib/history/policy";

function databaseHost(): string {
  const raw = process.env.DATABASE_URL || "";
  try {
    const url = new URL(raw);
    return `${url.hostname}/${url.pathname.replace(/^\//, "")}`;
  } catch {
    return "unparsed";
  }
}

async function main() {
  if (process.env.ROB_CONFIRM_DATABASE !== "1") {
    const counts = { approvedSources: 0, importedExhibitions: 0, historyReady: 0, rich: 0 };
    console.log(contentGateDecision(counts));
    console.log("approved sources: 0");
    console.log("imported exhibitions: 0");
    console.log("public artists: not queried");
    console.log("HISTORY_READY: 0");
    console.log("RICH_HISTORY: 0");
    console.log("median exhibitions among index-eligible artists: none");
    console.log(`Database target was not confirmed (${databaseHost()}). Pilot records were not read.`);
    process.exit(2);
  }
  const { contentGateCounts } = await import("../lib/history/queries");
  const { prisma } = await import("../lib/prisma");
  const counts = await contentGateCounts();
  const decision = contentGateDecision(counts);
  console.log(decision);
  console.log(`approved sources: ${counts.approvedSources}`);
  console.log(`imported exhibitions: ${counts.importedExhibitions}`);
  console.log(`public artists: ${counts.publicArtists}`);
  console.log(`HISTORY_READY: ${counts.historyReady}`);
  console.log(`RICH_HISTORY: ${counts.rich}`);
  console.log(`median exhibitions among index-eligible artists: ${median(counts.indexCounts) ?? "none"}`);
  await prisma.$disconnect();
  process.exit(decision === "PASS" ? 0 : 2);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
