import type { PrismaClient } from "@prisma/client";
import { prisma as untypedPrisma } from "@/lib/prisma";
import { classifyParticipant, firstPartyWrite, uniqueSlug, validateExhibitionInput } from "@/lib/history/policy";

const prisma = untypedPrisma as PrismaClient;

export async function createArtistRecord(input: {
  canonicalName: string;
  nativeName?: string | null;
  birthYear?: number | null;
  city?: string | null;
  country?: string | null;
  officialWebsite?: string | null;
  profileId?: string | null;
}) {
  const canonicalName = input.canonicalName.trim();
  if (!canonicalName) return { ok: false as const, error: "Artist name is required." };
  if (input.officialWebsite?.trim()) {
    try {
      const url = new URL(input.officialWebsite.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false as const, error: "Official website must be a URL." };
      }
    } catch {
      return { ok: false as const, error: "Official website must be a URL." };
    }
  }
  if (input.profileId) {
    const linked = await prisma.artistEntity.findUnique({ where: { profileId: input.profileId }, select: { id: true } });
    if (linked) input = { ...input, profileId: null };
  }
  const taken = new Set((await prisma.artistEntity.findMany({ select: { slug: true } })).map((row) => row.slug));
  const slug = uniqueSlug(canonicalName, taken);
  const artist = await prisma.artistEntity.create({
    data: {
      slug,
      canonicalName,
      nativeName: input.nativeName?.trim() || null,
      birthYear: input.birthYear ?? null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      officialWebsite: input.officialWebsite?.trim() || null,
      profileId: input.profileId ?? null,
    },
  });
  return { ok: true as const, artist };
}

export async function submitClaim(input: { slug: string; userId: string; note?: string | null }) {
  const artist = await prisma.artistEntity.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (!artist) return { ok: false as const, error: "Artist not found." };
  const existing = await prisma.artistEntityClaim.findFirst({
    where: { artistEntityId: artist.id, userId: input.userId, status: "PENDING" },
  });
  if (existing) return { ok: true as const, claim: existing, alreadyPending: true };
  const claim = await prisma.artistEntityClaim.create({
    data: {
      artistEntityId: artist.id,
      userId: input.userId,
      status: "PENDING",
      note: input.note?.trim() || null,
    },
  });
  return { ok: true as const, claim, alreadyPending: false };
}

export async function reviewClaim(input: { id: string; status: "APPROVED" | "REJECTED"; reviewedBy: string }) {
  if (input.status !== "APPROVED" && input.status !== "REJECTED") {
    return { ok: false as const, error: "Status must be approved or rejected." };
  }
  const claim = await prisma.artistEntityClaim.update({
    where: { id: input.id },
    data: { status: input.status, reviewedAt: new Date(), reviewedBy: input.reviewedBy },
  });
  if (input.status === "APPROVED") {
    const [entity, profile] = await Promise.all([
      prisma.artistEntity.findUnique({ where: { id: claim.artistEntityId }, select: { id: true, profileId: true } }),
      prisma.artistProfile.findUnique({ where: { userId: claim.userId }, select: { id: true } }),
    ]);
    if (entity && profile && !entity.profileId) {
      const occupied = await prisma.artistEntity.findUnique({ where: { profileId: profile.id }, select: { id: true } });
      if (!occupied) {
        await prisma.artistEntity.update({ where: { id: entity.id }, data: { profileId: profile.id } });
      }
    }
  }
  return { ok: true as const, claim };
}

async function nextSlug(base: string, rows: { slug: string | null }[]): Promise<string> {
  return uniqueSlug(base, new Set(rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug))));
}

async function findOrCreateSpace(name: string | null, city: string | null, country: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const cityValue = city?.trim() || null;
  const countryValue = country?.trim() || null;
  const existing = await prisma.space.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" }, city: cityValue, country: countryValue },
  });
  const space = existing ?? (await prisma.space.create({ data: { name: trimmed, city: cityValue, country: countryValue } }));
  const slugRow = await prisma.spaceSlug.findUnique({ where: { spaceId: space.id } });
  if (!slugRow) {
    const slug = await nextSlug(`${trimmed} ${cityValue ?? ""}`, await prisma.spaceSlug.findMany({ select: { slug: true } }));
    await prisma.spaceSlug.create({ data: { spaceId: space.id, slug } });
  }
  return space;
}

async function findOrCreateCurator(name: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const existing = await prisma.curator.findFirst({ where: { name: { equals: trimmed, mode: "insensitive" } } });
  const curator = existing ?? (await prisma.curator.create({ data: { name: trimmed } }));
  const slugRow = await prisma.curatorSlug.findUnique({ where: { curatorId: curator.id } });
  if (!slugRow) {
    const slug = await nextSlug(trimmed, await prisma.curatorSlug.findMany({ select: { slug: true } }));
    await prisma.curatorSlug.create({ data: { curatorId: curator.id, slug } });
  }
  return curator;
}

async function matchArtists(label: string): Promise<string[]> {
  const rows = await prisma.artistEntity.findMany({
    where: {
      OR: [
        { canonicalName: { equals: label, mode: "insensitive" } },
        { nativeName: { equals: label, mode: "insensitive" } },
        { aliases: { some: { label: { equals: label, mode: "insensitive" } } } },
      ],
    },
    select: { id: true },
    take: 5,
  });
  return rows.map((row) => row.id);
}

export async function addArtistExhibition(input: {
  userId: string;
  artistSlug: string | null;
  title: string;
  precision: string;
  year: number | null;
  month: number | null;
  day: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  spaceName: string | null;
  city: string | null;
  country: string | null;
  curatorName: string | null;
  participantNames: string[];
  sourceUrl: string | null;
}) {
  const dates = validateExhibitionInput(input);
  if (!dates.ok) return dates;
  let sourceUrl: string | null = null;
  let sourceName: string | null = null;
  if (input.sourceUrl?.trim()) {
    try {
      const url = new URL(input.sourceUrl.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false as const, error: "Source URL must be a URL." };
      }
      sourceUrl = url.toString();
      sourceName = url.hostname;
    } catch {
      return { ok: false as const, error: "Source URL must be a URL." };
    }
  }
  const profile = await prisma.artistProfile.findUnique({ where: { userId: input.userId }, select: { id: true } });
  let claimApproved = false;
  let ownerId: string | null = null;
  if (input.artistSlug) {
    const owner = await prisma.artistEntity.findUnique({ where: { slug: input.artistSlug }, select: { id: true } });
    if (owner) {
      ownerId = owner.id;
      const claim = await prisma.artistEntityClaim.findFirst({
        where: { artistEntityId: owner.id, userId: input.userId, status: "APPROVED" },
        select: { id: true },
      });
      claimApproved = Boolean(claim);
    }
  }
  const write = firstPartyWrite({ claimApproved, hasExternalSource: Boolean(sourceUrl) });
  const space = await findOrCreateSpace(input.spaceName, input.city, input.country);
  const curator = await findOrCreateCurator(input.curatorName);
  const slug = await nextSlug(
    `${input.title} ${dates.year ?? ""}`,
    await prisma.exhibitionHistoryMeta.findMany({ select: { slug: true } }),
  );
  const exhibition = await prisma.exhibition.create({
    data: {
      title: input.title.trim(),
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      spaceId: space?.id ?? null,
      curatorId: curator?.id ?? null,
      createdBy: profile?.id ?? null,
      isPublic: write.isPublic,
      historyMeta: {
        create: {
          slug,
          datePrecision: dates.precision,
          startYear: dates.year,
          startMonth: dates.month,
          startDay: dates.day,
          endYear: dates.endYear,
          endMonth: dates.endMonth,
          endDay: dates.endDay,
          clearanceStatus: write.clearanceStatus,
          contributorKind: write.contributorKind,
          publicationStatus: write.publicationStatus,
          origin: write.origin,
          sourceClearance: write.sourceClearance,
        },
      },
    },
  });

  if (ownerId && claimApproved) {
    await prisma.historyParticipation.create({ data: { exhibitionId: exhibition.id, artistEntityId: ownerId } });
  }

  for (const label of input.participantNames.map((name) => name.trim()).filter(Boolean)) {
    const matches = await matchArtists(label);
    const status = classifyParticipant(matches.length);
    if (status === "LINKED") {
      await prisma.historyParticipation.upsert({
        where: { exhibitionId_artistEntityId: { exhibitionId: exhibition.id, artistEntityId: matches[0] } },
        update: {},
        create: { exhibitionId: exhibition.id, artistEntityId: matches[0] },
      });
    } else {
      await prisma.historyUnresolvedName.create({ data: { exhibitionId: exhibition.id, label, status } });
    }
  }

  if (sourceUrl && sourceName) {
    const source = await prisma.historySource.create({
      data: {
        url: sourceUrl,
        sourceName,
        sourceType: "submitted-url",
        clearanceStatus: "REVIEW_REQUIRED",
      },
    });
    await prisma.exhibitionSource.create({ data: { exhibitionId: exhibition.id, sourceId: source.id } });
  }

  return { ok: true as const, slug, exhibitionId: exhibition.id, publicationStatus: write.publicationStatus };
}
