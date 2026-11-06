/**
 * Apply candidateAfterJob to RESEARCHING candidates whose ResearchJob is already DONE.
 * Does not insert a ResearchJob and does not start a workflow.
 *
 * Requires ROB_RECONCILE_CONFIRM=1 and a session-pooler DATABASE_URL (port 5432).
 */
import { prisma } from "@/lib/prisma";
import { reconcileTerminalResearchCandidates } from "@/lib/history/expansionStore";

async function main() {
  if (process.env.ROB_RECONCILE_CONFIRM !== "1") {
    console.log("refusing");
    process.exit(1);
  }
  const result = await reconcileTerminalResearchCandidates();
  console.log(JSON.stringify(result));
}

main()
  .catch((error) => {
    console.log(error instanceof Error ? error.name : "reconcile-failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
