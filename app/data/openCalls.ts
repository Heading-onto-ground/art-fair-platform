import { prisma } from "@/lib/prisma";
import { getOpenCallScheduleMap, upsertOpenCallSchedule } from "@/lib/openCallSchedule";

export type OpenCall = {
  id: string;
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  exhibitionDate?: string;
  posterImage?: string | null;
  createdAt: number;
  isExternal?: boolean;
  externalEmail?: string;
  externalUrl?: string;
  galleryWebsite?: string;
  galleryDescription?: string;
};

// ── Seed data for initial deployment ──
const SEED_OPEN_CALLS: Omit<OpenCall, "createdAt">[] = [
  { id: "ext_001", galleryId: "__external_documenta", gallery: "documenta Institute", city: "Kassel", country: "독일", theme: "Lumbung — Collective Practice & Resource Sharing", deadline: "2026-06-30", isExternal: true, externalEmail: "info@documenta.de", externalUrl: "https://www.documenta.de", galleryWebsite: "https://www.documenta.de", galleryDescription: "The world-renowned contemporary art exhibition held every five years in Kassel, Germany." },
  { id: "ext_002", galleryId: "__external_venice_biennale", gallery: "La Biennale di Venezia", city: "Venice", country: "이탈리아", theme: "Stranieri Ovunque — Foreigners Everywhere", deadline: "2026-05-20", isExternal: true, externalEmail: "info@labiennale.org", externalUrl: "https://www.labiennale.org", galleryWebsite: "https://www.labiennale.org", galleryDescription: "The Venice Biennale is the most important international exhibition of contemporary art." },
  { id: "ext_003", galleryId: "__external_art_basel", gallery: "Art Basel", city: "Basel", country: "스위스", theme: "Statements — Emerging Artists Solo Projects", deadline: "2026-04-15", isExternal: true, externalEmail: "apply@artbasel.com", externalUrl: "https://www.artbasel.com", galleryWebsite: "https://www.artbasel.com", galleryDescription: "Art Basel is the world's premier modern and contemporary art fair." },
  { id: "ext_004", galleryId: "__external_serpentine", gallery: "Serpentine Galleries", city: "London", country: "영국", theme: "Future Art Ecosystems — Technology x Art Open Call", deadline: "2026-05-31", isExternal: true, externalEmail: "submissions@serpentinegalleries.org", externalUrl: "https://www.serpentinegalleries.org", galleryWebsite: "https://www.serpentinegalleries.org", galleryDescription: "Serpentine Galleries present pioneering contemporary art exhibitions in Kensington Gardens, London." },
  { id: "ext_005", galleryId: "__external_moma_ps1", gallery: "MoMA PS1", city: "New York", country: "미국", theme: "Greater New York — Emerging Voices 2026", deadline: "2026-07-01", isExternal: true, externalEmail: "submissions@momaps1.org", externalUrl: "https://www.momaps1.org", galleryWebsite: "https://www.momaps1.org", galleryDescription: "MoMA PS1 is one of the largest organizations in the US devoted to contemporary art." },
  { id: "ext_006", galleryId: "__external_palais_tokyo", gallery: "Palais de Tokyo", city: "Paris", country: "프랑스", theme: "Résonance — International Artist Residency & Exhibition", deadline: "2026-06-15", isExternal: true, externalEmail: "submissions@palaisdetokyo.com", externalUrl: "https://www.palaisdetokyo.com", galleryWebsite: "https://www.palaisdetokyo.com", galleryDescription: "Palais de Tokyo is the largest center for contemporary art in Europe, located in Paris." },
  { id: "ext_007", galleryId: "__external_mori", gallery: "Mori Art Museum", city: "Tokyo", country: "일본", theme: "STARS — Contemporary Art from Asia & Beyond", deadline: "2026-05-10", isExternal: true, externalEmail: "opencall@mori.art.museum", externalUrl: "https://www.mori.art.museum", galleryWebsite: "https://www.mori.art.museum", galleryDescription: "Mori Art Museum is one of Japan's foremost contemporary art museums." },
  { id: "ext_008", galleryId: "__external_mmca", gallery: "MMCA (National Museum of Modern and Contemporary Art)", city: "Seoul", country: "한국", theme: "올해의 작가상 — Korea Artist Prize 2026", deadline: "2026-04-30", isExternal: true, externalEmail: "opencall@mmca.go.kr", externalUrl: "https://www.mmca.go.kr", galleryWebsite: "https://www.mmca.go.kr", galleryDescription: "The National Museum of Modern and Contemporary Art, Korea (MMCA) is one of Asia's leading art institutions." },
  { id: "ext_009", galleryId: "__external_ucca", gallery: "UCCA Center for Contemporary Art", city: "Beijing", country: "중국", theme: "New Directions — Emerging Chinese & International Art", deadline: "2026-06-01", isExternal: true, externalEmail: "submissions@ucca.org.cn", externalUrl: "https://ucca.org.cn", galleryWebsite: "https://ucca.org.cn", galleryDescription: "UCCA Center for Contemporary Art is a leading contemporary art institution in China." },
  { id: "ext_010", galleryId: "__external_acca", gallery: "ACCA (Australian Centre for Contemporary Art)", city: "Melbourne", country: "호주", theme: "Southern Perspectives — Asia-Pacific Art Exchange", deadline: "2026-07-15", isExternal: true, externalEmail: "submissions@acca.melbourne", externalUrl: "https://acca.melbourne", galleryWebsite: "https://acca.melbourne", galleryDescription: "ACCA is Australia's leading gallery for contemporary art." },
  { id: "oc_001", galleryId: "gallery_seoul@test.com", gallery: "Aurora Gallery", city: "Seoul", country: "한국", theme: "Wine & Body — 신체와 감각의 탐구", deadline: "2026-03-15" },
  { id: "oc_002", galleryId: "gallery_tokyo@test.com", gallery: "Blue Harbor Art Space", city: "Tokyo", country: "일본", theme: "Vanishing Chair — 消えゆく椅子", deadline: "2026-04-01" },
  { id: "oc_003", galleryId: "gallery_london@test.com", gallery: "North Bridge Gallery", city: "London", country: "영국", theme: "City Light — Urban Nocturne", deadline: "2026-04-20" },
  { id: "oc_004", galleryId: "gallery_paris@test.com", gallery: "Galerie Lumière", city: "Paris", country: "프랑스", theme: "L'Écho du Silence — The Echo of Silence", deadline: "2026-05-01" },
  { id: "oc_005", galleryId: "gallery_newyork@test.com", gallery: "Chelsea Art House", city: "New York", country: "미국", theme: "Digital Horizons — New Media Art", deadline: "2026-05-15" },
];

function toOpenCall(row: any): OpenCall {
  const rawGallery = String(row.gallery || "").trim();
  const gallery = /korean\s*art\s*blog/i.test(rawGallery) ? "Open Call" : rawGallery;
  return {
    id: row.id,
    galleryId: row.galleryId,
    gallery,
    city: row.city,
    country: row.country,
    theme: row.theme,
    deadline: row.deadline,
    exhibitionDate: row.exhibitionDate ?? undefined,
    posterImage: row.posterImage ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
    isExternal: row.isExternal ?? false,
    externalEmail: row.externalEmail ?? undefined,
    externalUrl: row.externalUrl ?? undefined,
    galleryWebsite: row.galleryWebsite ?? undefined,
    galleryDescription: row.galleryDescription ?? undefined,
  };
}

async function withSchedule(openCalls: OpenCall[]): Promise<OpenCall[]> {
  if (openCalls.length === 0) return openCalls;
  const map = await getOpenCallScheduleMap(openCalls.map((oc) => oc.id));
  return openCalls.map((oc) => {
    const schedule = map.get(oc.id);
    if (!schedule?.exhibitionDate) return oc;
    return {
      ...oc,
      exhibitionDate: schedule.exhibitionDate,
    };
  });
}

/** Seed open calls if DB is empty */
async function ensureSeeded() {
  try {
    const count = await prisma.openCall.count();
    if (count === 0) {
      await prisma.openCall.createMany({
        data: SEED_OPEN_CALLS.map((oc) => ({
          id: oc.id,
          galleryId: oc.galleryId,
          gallery: oc.gallery,
          city: oc.city,
          country: oc.country,
          theme: oc.theme,
          deadline: oc.deadline,
          isExternal: oc.isExternal ?? false,
          externalEmail: oc.externalEmail,
          externalUrl: oc.externalUrl,
          galleryWebsite: oc.galleryWebsite,
          galleryDescription: oc.galleryDescription,
        })),
        skipDuplicates: true,
      });
      console.log(`✅ Seeded ${SEED_OPEN_CALLS.length} open calls`);
    }
  } catch (e) {
    console.error("OpenCall seed error (non-fatal):", e);
  }
}

// Kick off seeding (non-blocking)
let _seedPromise: Promise<void> | null = null;
let _openCallColumnsEnsured = false;

async function ensureOpenCallColumns() {
  if (_openCallColumnsEnsured) return;
  try {
    // Backward-compatible guard for environments where the new column
    // was not added yet, preventing runtime 500s on list/find queries.
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "OpenCall" ADD COLUMN IF NOT EXISTS "exhibitionDate" TEXT;`
    );
    _openCallColumnsEnsured = true;
  } catch (e) {
    // Keep non-fatal to avoid blocking startup in restricted environments.
    console.error("OpenCall schema ensure error (non-fatal):", e);
  }
}

function seed() {
  if (!_seedPromise) _seedPromise = ensureSeeded();
  return _seedPromise;
}

export async function listOpenCalls(): Promise<OpenCall[]> {
  await ensureOpenCallColumns();
  await seed();
  const rows = await prisma.openCall.findMany({ orderBy: { createdAt: "desc" } });
  return withSchedule(rows.map(toOpenCall));
}

export async function listOpenCallsByGallery(galleryId: string): Promise<OpenCall[]> {
  await ensureOpenCallColumns();
  await seed();
  const rows = await prisma.openCall.findMany({ where: { galleryId }, orderBy: { createdAt: "desc" } });
  return withSchedule(rows.map(toOpenCall));
}

export async function getOpenCallById(id: string): Promise<OpenCall | null> {
  await ensureOpenCallColumns();
  await seed();
  const row = await prisma.openCall.findUnique({ where: { id } });
  if (!row) return null;
  const [openCall] = await withSchedule([toOpenCall(row)]);
  return openCall ?? null;
}

export async function createOpenCall(input: {
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  exhibitionDate?: string;
  posterImage?: string;
  isExternal?: boolean;
  externalEmail?: string;
  externalUrl?: string;
  galleryWebsite?: string;
  galleryDescription?: string;
}): Promise<OpenCall> {
  await ensureOpenCallColumns();
  const row = await prisma.openCall.create({
    data: {
      galleryId: input.galleryId,
      gallery: input.gallery,
      city: input.city,
      country: input.country,
      theme: input.theme,
      deadline: input.deadline,
      posterImage: input.posterImage,
      isExternal: input.isExternal ?? false,
      externalEmail: input.externalEmail,
      externalUrl: input.externalUrl,
      galleryWebsite: input.galleryWebsite,
      galleryDescription: input.galleryDescription,
    },
  });
  const created = toOpenCall(row);
  const exhibitionDate = String(input.exhibitionDate || "").trim();
  if (exhibitionDate) {
    try {
      await upsertOpenCallSchedule({
        openCallId: created.id,
        exhibitionDate,
        applicationDeadline: created.deadline,
      });
      created.exhibitionDate = exhibitionDate;
    } catch (e) {
      console.error("OpenCallSchedule upsert error (non-fatal):", e);
    }
  }
  return created;
}

export async function updateOpenCallPoster(id: string, posterImage: string | null): Promise<OpenCall | null> {
  try {
    await ensureOpenCallColumns();
    const row = await prisma.openCall.update({
      where: { id },
      data: { posterImage },
    });
    return toOpenCall(row);
  } catch {
    return null;
  }
}
