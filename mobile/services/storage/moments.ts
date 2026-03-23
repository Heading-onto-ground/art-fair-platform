/**
 * Local storage for artist moments.
 * Replace with ROB backend API: POST/GET /api/artist/moments
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ArtistMoment } from "@/types";

const STORAGE_KEY = "@rob_artist_moments";

export async function getMoments(): Promise<ArtistMoment[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveMoment(moment: ArtistMoment): Promise<void> {
  const moments = await getMoments();
  moments.unshift(moment);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(moments));
}

export async function appendMoment(moment: ArtistMoment): Promise<void> {
  return saveMoment(moment);
}

export async function replaceMoment(
  clientId: string,
  serverMoment: ArtistMoment
): Promise<void> {
  const moments = await getMoments();
  const filtered = moments.filter((m) => m.id !== clientId);
  filtered.unshift(serverMoment);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function clearMoments(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
