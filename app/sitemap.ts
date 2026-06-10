import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { COUNTRIES } from "@/lib/countryData";
import { listCitiesWithContent } from "@/lib/cityData";
import { SITE_URL } from "@/lib/seo";

// Regenerate at most every 6 hours; crawler hits should not fan out 12+ DB queries each time.
export const revalidate = 21600;

// A single sitemap file supports up to 50,000 URLs. Cap each entity bucket so a
// runaway table can never push the file over the limit or time out the query.
const MAX_PER_TYPE = 5000;

type Entry = MetadataRoute.Sitemap[number];

function url(path: string, lastModified?: Date | string | number | null, opts?: Partial<Entry>): Entry {
  return {
    url: `${SITE_URL}${path}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    ...opts,
  };
}

// Each query is isolated: a failure in one bucket must not blank the whole sitemap.
async function safe<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (e) {
    console.error(`sitemap: ${label} query failed`, e);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: Entry[] = [
    url("/", undefined, { changeFrequency: "daily", priority: 1 }),
    url("/about", undefined, { changeFrequency: "monthly", priority: 0.5 }),
    url("/guide", undefined, { changeFrequency: "monthly", priority: 0.5 }),
    url("/guide/activity-certification", undefined, { changeFrequency: "monthly", priority: 0.7 }),
    url("/support", undefined, { changeFrequency: "monthly", priority: 0.3 }),
    url("/contact", undefined, { changeFrequency: "yearly", priority: 0.3 }),
    url("/artists", undefined, { changeFrequency: "daily", priority: 0.8 }),
    url("/galleries", undefined, { changeFrequency: "daily", priority: 0.8 }),
    url("/open-calls", undefined, { changeFrequency: "daily", priority: 0.9 }),
    url("/curators", undefined, { changeFrequency: "weekly", priority: 0.6 }),
    url("/spaces", undefined, { changeFrequency: "weekly", priority: 0.6 }),
    url("/community", undefined, { changeFrequency: "daily", priority: 0.6 }),
  ];

  const countryPages: Entry[] = COUNTRIES.map((c) =>
    url(`/country/${c.code}`, undefined, { changeFrequency: "weekly", priority: 0.7 })
  );

  const cities = await safe<{ slug: string; displayName: string; count: number }>("cities", () =>
    listCitiesWithContent(2)
  );
  const cityPages: Entry[] = cities
    .slice(0, MAX_PER_TYPE)
    .map((c) =>
      url(`/city/${encodeURIComponent(c.slug)}`, undefined, {
        changeFrequency: "weekly",
        priority: 0.6,
      })
    );

  // Public artist practice-record pages. `exhibitions_public` is a runtime column
  // not present in schema.prisma, so query it via raw SQL (mirrors the public API).
  const artistRows = await safe<{ artistId: string; updatedAt: Date | null }>("artists", () =>
    prisma.$queryRawUnsafe(
      `SELECT "artistId", "updatedAt" FROM "ArtistProfile"
       WHERE "exhibitions_public" = true AND "artistId" IS NOT NULL
       ORDER BY "updatedAt" DESC LIMIT ${MAX_PER_TYPE}`
    )
  );
  const artistPages: Entry[] = artistRows
    .filter((r) => r.artistId)
    .map((r) =>
      url(`/artist/public/${encodeURIComponent(r.artistId)}`, r.updatedAt, {
        changeFrequency: "weekly",
        priority: 0.7,
      })
    );

  const galleries = await safe<{ userId: string; updatedAt: Date }>("galleries", () =>
    prisma.galleryProfile.findMany({
      select: { userId: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_PER_TYPE,
    })
  );
  const galleryPages: Entry[] = galleries.map((g) =>
    url(`/galleries/${encodeURIComponent(g.userId)}`, g.updatedAt, {
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );

  const exhibitions = await safe<{ id: string; updatedAt: Date }>("exhibitions", () =>
    prisma.exhibition.findMany({
      where: { isPublic: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_PER_TYPE,
    })
  );
  const exhibitionPages: Entry[] = exhibitions.map((e) =>
    url(`/exhibitions/${e.id}`, e.updatedAt, { changeFrequency: "weekly", priority: 0.6 })
  );

  const openCalls = await safe<{ id: string; updatedAt: Date }>("openCalls", () =>
    prisma.openCall.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_PER_TYPE,
    })
  );
  const openCallPages: Entry[] = openCalls.map((o) =>
    url(`/open-calls/${o.id}`, o.updatedAt, { changeFrequency: "daily", priority: 0.8 })
  );

  const spaces = await safe<{ id: string; createdAt: Date }>("spaces", () =>
    prisma.space.findMany({
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_PER_TYPE,
    })
  );
  const spacePages: Entry[] = spaces.map((s) =>
    url(`/spaces/${s.id}`, s.createdAt, { changeFrequency: "monthly", priority: 0.5 })
  );

  const curators = await safe<{ id: string; createdAt: Date }>("curators", () =>
    prisma.curator.findMany({
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_PER_TYPE,
    })
  );
  const curatorPages: Entry[] = curators.map((c) =>
    url(`/curators/${c.id}`, c.createdAt, { changeFrequency: "monthly", priority: 0.5 })
  );

  const posts = await safe<{ id: string; createdAt: Date }>("community", () =>
    prisma.communityPost.findMany({
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_PER_TYPE,
    })
  );
  const communityPages: Entry[] = posts.map((p) =>
    url(`/community/${p.id}`, p.createdAt, { changeFrequency: "weekly", priority: 0.4 })
  );

  return [
    ...staticPages,
    ...countryPages,
    ...cityPages,
    ...artistPages,
    ...galleryPages,
    ...exhibitionPages,
    ...openCallPages,
    ...spacePages,
    ...curatorPages,
    ...communityPages,
  ];
}
