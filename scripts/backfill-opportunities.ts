import { prisma } from "@/lib/prisma";
import { backfillOpportunities } from "@/lib/opportunity/backfill";
import { prismaOpportunityStore } from "@/lib/opportunity/store";

async function main() {
  const calls = await prisma.openCall.findMany({ orderBy: { createdAt: "asc" } });
  const result = await backfillOpportunities(calls, prismaOpportunityStore());
  console.log(JSON.stringify(result));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "backfill failed");
  await prisma.$disconnect();
  process.exit(1);
});
