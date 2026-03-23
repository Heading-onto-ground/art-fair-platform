/**
 * Local storage for moment reactions.
 * Persists reactions when API fails (e.g. MOCK moments, offline).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactionType } from "@/types";

const STORAGE_KEY = "@rob_local_reactions";

export interface StoredReaction {
  reactions: Record<string, number>;
  myReaction: ReactionType | null;
}

export async function getReactions(): Promise<Record<string, StoredReaction>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveReactions(reactions: Record<string, StoredReaction>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reactions));
  } catch {
    // ignore
  }
}

export async function setReaction(
  momentId: string,
  reactions: Record<string, number>,
  myReaction: ReactionType | null
): Promise<void> {
  const all = await getReactions();
  all[momentId] = { reactions, myReaction };
  await saveReactions(all);
}
