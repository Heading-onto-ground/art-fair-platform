export type Application = {
  id: string;
  openCallId: string;
  galleryId: string;
  artistId: string;
  artistName: string;
  artistEmail: string;
  artistCountry: string;
  artistCity: string;
  artistPortfolioUrl?: string;
  message?: string;
  status: "submitted" | "reviewing" | "accepted" | "rejected";
  shippingStatus: "pending" | "shipped" | "received" | "inspected" | "exhibited";
  shippingNote?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: number;
  updatedAt: number;
};

const KEY = "__APPLICATIONS_STORE__";

function getStore(): Application[] {
  const g = globalThis as any;
  if (!g[KEY]) {
    g[KEY] = [] satisfies Application[];
  }
  return g[KEY] as Application[];
}

export function listApplications(): Application[] {
  return [...getStore()];
}

export function listApplicationsByOpenCall(openCallId: string): Application[] {
  return getStore().filter((a) => a.openCallId === openCallId);
}

export function listApplicationsByArtist(artistId: string): Application[] {
  return getStore().filter((a) => a.artistId === artistId);
}

export function findApplication(openCallId: string, artistId: string): Application | null {
  return getStore().find((a) => a.openCallId === openCallId && a.artistId === artistId) ?? null;
}

export function getApplicationById(id: string): Application | null {
  return getStore().find((a) => a.id === id) ?? null;
}

export function createApplication(input: {
  openCallId: string;
  galleryId: string;
  artistId: string;
  artistName: string;
  artistEmail: string;
  artistCountry: string;
  artistCity: string;
  artistPortfolioUrl?: string;
  message?: string;
}): Application {
  const now = Date.now();
  const created: Application = {
    id: `app_${now}_${Math.random().toString(16).slice(2)}`,
    openCallId: input.openCallId,
    galleryId: input.galleryId,
    artistId: input.artistId,
    artistName: input.artistName,
    artistEmail: input.artistEmail,
    artistCountry: input.artistCountry,
    artistCity: input.artistCity,
    artistPortfolioUrl: input.artistPortfolioUrl,
    message: input.message,
    status: "submitted",
    shippingStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const store = getStore();
  store.unshift(created);
  return created;
}

export function updateApplicationShipping(
  id: string,
  input: {
    shippingStatus?: "pending" | "shipped" | "received" | "inspected" | "exhibited";
    shippingNote?: string;
    shippingCarrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  }
): Application | null {
  const store = getStore();
  const idx = store.findIndex((a) => a.id === id);
  if (idx < 0) return null;

  const existing = store[idx];
  const updated: Application = {
    ...existing,
    shippingStatus: input.shippingStatus ?? existing.shippingStatus,
    shippingNote: input.shippingNote ?? existing.shippingNote,
    shippingCarrier: input.shippingCarrier ?? existing.shippingCarrier,
    trackingNumber: input.trackingNumber ?? existing.trackingNumber,
    trackingUrl: input.trackingUrl ?? existing.trackingUrl,
    updatedAt: Date.now(),
  };

  store[idx] = updated;
  return updated;
}

export function updateApplicationStatus(
  id: string,
  status: "submitted" | "reviewing" | "accepted" | "rejected"
): Application | null {
  const store = getStore();
  const idx = store.findIndex((a) => a.id === id);
  if (idx < 0) return null;

  const existing = store[idx];
  const updated: Application = {
    ...existing,
    status,
    updatedAt: Date.now(),
  };

  store[idx] = updated;
  return updated;
}
