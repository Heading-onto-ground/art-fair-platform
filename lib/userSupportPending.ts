const STORAGE_KEY = "afp_support_seen_admin_ids";

export const SUPPORT_SEEN_EVENT = "afp-support-seen";

export type SupportMsgLite = { id: string; fromAdmin: boolean };

function readSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function readSeenAdminSupportIds(): Set<string> {
  return readSeenIds();
}

function writeSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function mergeSeenAdminIds(ids: string[]) {
  const s = readSeenIds();
  ids.forEach((id) => s.add(id));
  writeSeenIds(s);
}

/** Call after loading /support so unread badge clears immediately. */
export function markAllAdminSupportMessagesSeen(messages: SupportMsgLite[]) {
  const ids = messages.filter((m) => m.fromAdmin).map((m) => m.id);
  mergeSeenAdminIds(ids);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SUPPORT_SEEN_EVENT));
  }
}

export function unreadAdminSupportCount(messages: SupportMsgLite[]): number {
  const seen = readSeenIds();
  return messages.filter((m) => m.fromAdmin && !seen.has(m.id)).length;
}

export function hasNewAdminMessageSincePoll(prevAdminIds: Set<string>, currentAdminIds: string[]): boolean {
  return currentAdminIds.some((id) => !prevAdminIds.has(id));
}
