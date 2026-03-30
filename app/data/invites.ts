export type Invite = {
  id: string;
  galleryId: string;
  artistId: string;
  openCallId: string;
  message: string;
  status: "sent" | "viewed" | "accepted" | "declined";
  createdAt: number;
  viewedAt?: number;
  respondedAt?: number;
  responseTimeHours?: number;
  lastActor?: "gallery" | "artist";
};

const KEY = "__INVITES_STORE__";

function getStore(): Invite[] {
  const g = globalThis as typeof globalThis & { [key: string]: Invite[] | undefined };
  if (!g[KEY]) {
    g[KEY] = [] satisfies Invite[];
  }
  return g[KEY] as Invite[];
}

export function listInvitesByGallery(galleryId: string): Invite[] {
  return getStore().filter((i) => i.galleryId === galleryId);
}

export function listInvitesByArtist(artistId: string): Invite[] {
  return getStore().filter((i) => i.artistId === artistId);
}

export function addInvite(
  input: Omit<Invite, "id" | "createdAt" | "status">
): Invite {
  const created: Invite = {
    ...input,
    id: `invite_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    status: "sent",
    createdAt: Date.now(),
  };
  const store = getStore();
  store.unshift(created);
  return created;
}

export function updateInviteStatus(
  id: string,
  status: Invite["status"],
  actor: "gallery" | "artist" = "artist"
): Invite | null {
  const store = getStore();
  const idx = store.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const prev = store[idx];
  const now = Date.now();
  const nextViewedAt = status === "viewed" ? prev.viewedAt ?? now : prev.viewedAt;
  const nextRespondedAt = status === "accepted" || status === "declined" ? now : prev.respondedAt;
  const responseTimeHours =
    nextRespondedAt && nextViewedAt
      ? Number(((nextRespondedAt - nextViewedAt) / (1000 * 60 * 60)).toFixed(1))
      : prev.responseTimeHours;
  const updated: Invite = {
    ...prev,
    status,
    viewedAt: nextViewedAt,
    respondedAt: nextRespondedAt,
    responseTimeHours,
    lastActor: actor,
  };
  store[idx] = updated;
  return updated;
}
