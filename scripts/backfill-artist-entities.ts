import type { PrismaClient } from "@prisma/client";
import { prisma as untypedPrisma } from "../lib/prisma";
import { planBackfill } from "../lib/history/backfill";

const prisma = untypedPrisma as PrismaClient;

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
  const host = databaseHost();
  if (process.env.ROB_CONFIRM_DATABASE !== "1") {
    console.log(`Refusing artist backfill. Database target is not confirmed (${host}).`);
    process.exit(2);
  }
  const profiles = await prisma.artistProfile.findMany({
    where: { artistEntity: null },
    select: { id: true, name: true, country: true, city: true, website: true, startedYear: true },
  });
  const taken = (await prisma.artistEntity.findMany({ select: { slug: true } })).map((row) => row.slug);
  const plan = planBackfill(profiles, taken);
  for (const row of plan) {
    await prisma.artistEntity.create({ data: row });
  }
  console.log(`Linked ${plan.length} artist profiles to new artist entities. Same names were not merged.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
