/** Threads from GET /api/admin/support/threads (subset used for alerts). */
export type ThreadForPendingAlert = {
  id: string;
  lastMessage: { fromAdmin: boolean; createdAt: string } | null;
};

export function pendingSnapshotFromThreads(threads: ThreadForPendingAlert[]): { id: string; at: string }[] {
  return threads
    .filter((t) => t.lastMessage && !t.lastMessage.fromAdmin)
    .map((t) => ({ id: t.id, at: t.lastMessage!.createdAt }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** True when a new user message is waiting (new thread or newer last message from user). */
export function hasNewUserPendingActivity(
  prev: { id: string; at: string }[] | null,
  next: { id: string; at: string }[]
): boolean {
  if (prev === null) return false;
  const prevMap = new Map(prev.map((x) => [x.id, x.at] as const));
  for (const { id, at } of next) {
    const oldAt = prevMap.get(id);
    if (oldAt === undefined || oldAt !== at) return true;
  }
  return false;
}
