import type { PrismaClient } from "@prisma/client";
import { prisma as untypedPrisma } from "@/lib/prisma";
import { duplicateDecision, resolveVerifiedSpace } from "@/lib/history/growth";
import { mayCreateParticipation } from "@/lib/history/identity";
import { uniqueSlug } from "@/lib/history/policy";
import { spaceDecisionFor, type CrawlFact } from "@/lib/history/trustedCrawl";
import { mayPublishCrawledFact, type ResearchJobRecord } from "@/lib/history/researchJob";
import type { PublishResult } from "@/lib/history/researchAdvance";

const prisma = untypedPrisma as PrismaClient;

async function takenSlugs(): Promise<Set<string>> {
  const rows = await prisma.artistEntity.findMany({ select: { slug: true } });
  return new Set(rows.map((row) => row.slug));
}

async function ensureArtist(job: ResearchJobRecord, fact: CrawlFact): Promise<{ id: string; slug: string } | null> {
  if (job.resolvedArtistId && job.resolvedArtistSlug) return { id: job.resolvedArtistId, slug: job.resolvedArtistSlug };
  const proposed = job.payload.proposedSlug;
  if (!proposed) return null;
  const existing = await prisma.artistEntity.findUnique({ where: { slug: proposed }, select: { id: true, slug: true } });
  if (existing) return existing;
  const labels = [...new Set(job.payload.labels.map((label) => label.trim()).filter(Boolean))];
  for (const label of labels) {
    const clash = await prisma.artistAlias.findFirst({
      where: { label: { equals: label, mode: "insensitive" } },
      select: { artist: { select: { id: true, slug: true } } },
    });
    if (clash && clash.artist.slug !== proposed) return null;
    const named = await prisma.artistEntity.findFirst({
      where: {
        OR: [
          { canonicalName: { equals: label, mode: "insensitive" } },
          { nativeName: { equals: label, mode: "insensitive" } },
        ],
      },
      select: { id: true, slug: true },
    });
    if (named && named.slug !== proposed) return null;
  }
  const subject = fact.participants.find((person) => person.slug === proposed && person.identity === "EXACT");
  if (!subject || !mayCreateParticipation(subject.evidence)) return null;
  const slug = uniqueSlug(job.payload.latinName || proposed, await takenSlugs());
  const created = await prisma.artistEntity.create({
    data: {
      slug,
      canonicalName: job.payload.latinName || subject.label,
      nativeName: job.payload.nativeName,
      officialWebsite: job.payload.identity?.officialWebsites[0] ?? null,
      aliases: { create: labels.filter((label) => label !== (job.payload.latinName || subject.label)).slice(0, 8).map((label) => ({ label })) },
    },
    select: { id: true, slug: true },
  });
  return created;
}

async function ensureSpace(fact: CrawlFact): Promise<string | null> {
  if (!fact.venue) return null;
  const decision = spaceDecisionFor(fact.venue);
  if (decision === "REVIEW" || decision === "MISSING") return null;
  const verified = resolveVerifiedSpace(fact.venue);
  const name = verified?.canonicalName ?? fact.venue.trim();
  const city = fact.city?.trim() || null;
  const country = fact.country?.trim() || null;
  const existing = verified
    ? await prisma.spaceSlug.findUnique({ where: { slug: verified.slug }, select: { spaceId: true } })
    : null;
  if (existing) return existing.spaceId;
  const byName = await prisma.space.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, city, country },
    select: { id: true },
  });
  const space = byName ?? await prisma.space.create({ data: { name, city, country, type: verified ? "gallery" : null } });
  const slugRow = await prisma.spaceSlug.findUnique({ where: { spaceId: space.id } });
  if (!slugRow) {
    const taken = new Set((await prisma.spaceSlug.findMany({ select: { slug: true } })).map((row) => row.slug));
    const slug = uniqueSlug(verified?.slug ?? name, taken);
    await prisma.spaceSlug.create({ data: { spaceId: space.id, slug } });
  }
  return space.id;
}

export async function publishResearchFact(job: ResearchJobRecord, fact: CrawlFact): Promise<PublishResult> {
  if (!mayPublishCrawledFact(fact) || !fact.title || fact.startYear == null) return { ok: false, code: "PUBLICATION_REVIEW" };
  const artist = await ensureArtist(job, fact);
  if (!artist) return { ok: false, code: "IDENTITY_AMBIGUOUS" };
  const yearRows = await prisma.exhibition.findMany({
    where: { historyMeta: { startYear: fact.startYear, publicationStatus: "PUBLIC" } },
    select: { id: true, title: true, city: true, space: { select: { name: true } } },
  });
  const decision = yearRows
    .map((row) => duplicateDecision(
      { title: fact.title ?? "", startYear: fact.startYear, space: fact.venue },
      { title: row.title, year: fact.startYear, space: row.space?.name ?? null },
    ))
    .find((item) => item !== "NEW") ?? "NEW";
  if (decision === "REVIEW") return { ok: false, code: "DUPLICATE_REVIEW" };
  const exact = decision === "EXACT"
    ? yearRows.find((row) => duplicateDecision(
      { title: fact.title ?? "", startYear: fact.startYear, space: fact.venue },
      { title: row.title, year: fact.startYear, space: row.space?.name ?? null },
    ) === "EXACT")
    : null;
  if (exact) {
    await prisma.historyParticipation.upsert({
      where: { exhibitionId_artistEntityId: { exhibitionId: exact.id, artistEntityId: artist.id } },
      update: {},
      create: { exhibitionId: exact.id, artistEntityId: artist.id },
    });
    return { ok: true, artistId: artist.id, artistSlug: artist.slug };
  }
  const spaceId = await ensureSpace(fact);
  const taken = new Set((await prisma.exhibitionHistoryMeta.findMany({ select: { slug: true } })).map((row) => row.slug).filter((slug): slug is string => Boolean(slug)));
  const slug = uniqueSlug(`${fact.title} ${fact.startYear}`, taken);
  const exhibition = await prisma.exhibition.create({
    data: {
      title: fact.title,
      city: fact.city,
      country: fact.country,
      spaceId,
      createdBy: null,
      isPublic: true,
      historyMeta: {
        create: {
          slug,
          datePrecision: fact.datePrecision === "UNKNOWN" ? "YEAR" : fact.datePrecision,
          startYear: fact.startYear,
          startMonth: fact.startMonth,
          startDay: fact.startDay,
          endYear: fact.endYear,
          endMonth: fact.endMonth,
          endDay: fact.endDay,
          clearanceStatus: "APPROVED",
          publicationStatus: "PUBLIC",
          origin: "ROB_RESEARCHED",
          sourceClearance: "APPROVED",
        },
      },
    },
    select: { id: true },
  });
  await prisma.historyParticipation.create({ data: { exhibitionId: exhibition.id, artistEntityId: artist.id } });
  for (const person of fact.participants) {
    if (person.slug === artist.slug) continue;
    if (person.identity === "EXACT" && person.slug) continue;
    if (!person.label.trim()) continue;
    await prisma.historyUnresolvedName.create({
      data: { exhibitionId: exhibition.id, label: person.label.slice(0, 200), status: "UNRESOLVED_PARTICIPANT" },
    });
  }
  const source = await prisma.historySource.create({
    data: {
      url: fact.provenance.sourceUrl,
      sourceName: fact.provenance.sourceName,
      sourceType: fact.provenance.sourceClass,
      retrievedAt: new Date(fact.provenance.retrievedAt),
      clearanceStatus: "APPROVED",
      internalUseDecision: "ALLOW_LIMITED",
      externalPermission: "NOT_APPLICABLE",
      contentScope: "FACTUAL_METADATA_ONLY",
    },
  });
  await prisma.exhibitionSource.create({ data: { exhibitionId: exhibition.id, sourceId: source.id } });
  return { ok: true, artistId: artist.id, artistSlug: artist.slug };
}
