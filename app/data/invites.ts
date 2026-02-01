export type Invite = {
  id: string;
  galleryId: string;
  artistId: string;
  openCallId: string;
  message: string;
  status: "sent" | "viewed" | "accepted" | "declined";
  createdAt: number;
};

const KEY = "__INVITES_STORE__";

function getStore(): Invite[] {
  const g = globalThis as any;
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

export function updateInviteStatus(id: string, status: Invite["status"]): Invite | null {
  const store = getStore();
  const idx = store.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const updated: Invite = { ...store[idx], status };
  store[idx] = updated;
  return updated;
}
