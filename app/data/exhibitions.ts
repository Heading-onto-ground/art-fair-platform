export type Exhibition = {
  id: string;
  galleryId: string;
  title: string;
  country: string;
  city: string;
  year: number;
  summary?: string;
};

const KEY = "__EXHIBITIONS_STORE__";

function seedStore(): Exhibition[] {
  return [
    // Korea gallery
    {
      id: "exh_kr_2024_01",
      galleryId: "gallery_dmx69@naver.com",
      title: "Aurora Spring Light",
      country: "한국",
      city: "Seoul",
      year: 2024,
      summary: "Contemporary painting & sculpture group show.",
    },
    {
      id: "exh_kr_2023_01",
      galleryId: "gallery_dmx69@naver.com",
      title: "Midnight River",
      country: "한국",
      city: "Seoul",
      year: 2023,
      summary: "Photography + mixed media special exhibition.",
    },
    {
      id: "exh_kr_2022_01",
      galleryId: "gallery_dmx69@naver.com",
      title: "Soft Ink",
      country: "한국",
      city: "Seoul",
      year: 2022,
      summary: "Ink + abstract painting series.",
    },
    // Japan gallery
    {
      id: "exh_jp_2024_01",
      galleryId: "gallery_tokyo@art.jp",
      title: "Blue Harbor: New Waves",
      country: "일본",
      city: "Tokyo",
      year: 2024,
      summary: "Emerging artists showcase.",
    },
    {
      id: "exh_jp_2023_01",
      galleryId: "gallery_tokyo@art.jp",
      title: "Quiet Chair",
      country: "일본",
      city: "Tokyo",
      year: 2023,
      summary: "Solo installations and sculpture.",
    },
    {
      id: "exh_jp_2021_01",
      galleryId: "gallery_tokyo@art.jp",
      title: "Paper Garden",
      country: "일본",
      city: "Tokyo",
      year: 2021,
      summary: "Mixed media on paper.",
    },
    // UK gallery
    {
      id: "exh_uk_2024_01",
      galleryId: "gallery_london@art.uk",
      title: "North Bridge: City Light",
      country: "영국",
      city: "London",
      year: 2024,
      summary: "Urban art fair collaboration.",
    },
    {
      id: "exh_uk_2022_01",
      galleryId: "gallery_london@art.uk",
      title: "Grey Thames",
      country: "영국",
      city: "London",
      year: 2022,
      summary: "Historical modern art selection.",
    },
    {
      id: "exh_uk_2020_01",
      galleryId: "gallery_london@art.uk",
      title: "Stone & Fog",
      country: "영국",
      city: "London",
      year: 2020,
      summary: "Sculpture + installation archive.",
    },
  ];
}

function getStore(): Exhibition[] {
  const g = globalThis as any;
  if (!g[KEY]) {
    g[KEY] = seedStore();
  }
  return g[KEY] as Exhibition[];
}

export function getExhibitionsByGalleryId(galleryId: string): Exhibition[] {
  return getStore().filter((e) => e.galleryId === galleryId);
}

export function addExhibition(input: Omit<Exhibition, "id">): Exhibition {
  const created: Exhibition = {
    ...input,
    id: `exh_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  };
  const store = getStore();
  store.unshift(created);
  return created;
}

export function updateExhibition(
  id: string,
  input: Partial<Omit<Exhibition, "id" | "galleryId">>
): Exhibition | null {
  const store = getStore();
  const idx = store.findIndex((e) => e.id === id);
  if (idx < 0) return null;

  const existing = store[idx];
  const updated: Exhibition = {
    ...existing,
    title: input.title ?? existing.title,
    country: input.country ?? existing.country,
    city: input.city ?? existing.city,
    year: input.year ?? existing.year,
    summary: input.summary ?? existing.summary,
  };
  store[idx] = updated;
  return updated;
}

export function deleteExhibition(id: string): boolean {
  const store = getStore();
  const idx = store.findIndex((e) => e.id === id);
  if (idx < 0) return false;
  store.splice(idx, 1);
  return true;
}
