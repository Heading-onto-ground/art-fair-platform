export type OpenCall = {
  id: string;
  galleryId: string; // ✅ 갤러리 로그인 userId
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
  createdAt: number;
};

const KEY = "__OPEN_CALLS_STORE__";

function getStore(): OpenCall[] {
  const g = globalThis as any;
  if (!g[KEY]) {
    g[KEY] = [
      {
        id: "oc_001",
        galleryId: "gallery_dmx69@naver.com",
        gallery: "Aurora Gallery",
        city: "Seoul",
        country: "한국",
        theme: "Wine & Body",
        deadline: "2026-02-15",
        createdAt: Date.now(),
      },
      {
        id: "oc_002",
        galleryId: "gallery_tokyo@art.jp",
        gallery: "Blue Harbor Art Space",
        city: "Tokyo",
        country: "일본",
        theme: "Vanishing Chair",
        deadline: "2026-03-01",
        createdAt: Date.now(),
      },
      {
        id: "oc_003",
        galleryId: "gallery_london@art.uk",
        gallery: "North Bridge Gallery",
        city: "London",
        country: "영국",
        theme: "City Light",
        deadline: "2026-03-20",
        createdAt: Date.now(),
      },
    ] satisfies OpenCall[];
  }
  return g[KEY] as OpenCall[];
}

export function listOpenCalls(): OpenCall[] {
  return [...getStore()];
}

export function listOpenCallsByGallery(galleryId: string): OpenCall[] {
  return getStore().filter((o) => o.galleryId === galleryId);
}

export function getOpenCallById(id: string) {
  return getStore().find((o) => o.id === id) ?? null;
}

export function createOpenCall(input: {
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
}): OpenCall {
  const existing = getStore().find((o) => o.country === input.country);
  if (existing) {
    throw new Error("open call already exists for this country");
  }

  const created: OpenCall = {
    id: `oc_${Date.now()}`,
    galleryId: input.galleryId,
    gallery: input.gallery,
    city: input.city,
    country: input.country,
    theme: input.theme,
    deadline: input.deadline,
    createdAt: Date.now(),
  };

  const store = getStore();
  store.unshift(created);
  return created;
}