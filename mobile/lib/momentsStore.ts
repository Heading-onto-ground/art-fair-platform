/**
 * Global store for artist moments.
 * Loads from ROB API when logged in; merges with AsyncStorage to preserve local-only moments.
 *
 * Data flow:
 * 1. Fetch from API
 * 2. If API ok: merge API moments + local-only moments (client ids like "moment-xxx")
 * 3. If API fail: use AsyncStorage only
 * 4. Dedupe by id, sort by createdAt desc
 */

import { create } from "zustand";
import { getMoments, saveMoment, replaceMoment as replaceMomentStorage } from "@/services/storage/moments";
import { fetchMoments } from "@/services/api/momentService";
import type { ArtistMoment } from "@/types";

const isClientGeneratedId = (id: string) => id.startsWith("moment-");

function mergeAndSort(apiMoments: ArtistMoment[], localMoments: ArtistMoment[]): ArtistMoment[] {
  const apiIds = new Set(apiMoments.map((m) => m.id));
  const localOnly = localMoments.filter(
    (m) => isClientGeneratedId(m.id) && !apiIds.has(m.id)
  );
  const merged = [...apiMoments, ...localOnly];
  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

interface MomentsState {
  moments: ArtistMoment[];
  loading: boolean;
  load: () => Promise<void>;
  addMoment: (moment: ArtistMoment) => Promise<void>;
  replaceMoment: (clientId: string, serverMoment: ArtistMoment) => Promise<void>;
}

export const useMomentsStore = create<MomentsState>((set) => ({
  moments: [],
  loading: true,
  load: async () => {
    set({ loading: true });
    const [apiResult, localMoments] = await Promise.all([
      fetchMoments(),
      getMoments(),
    ]);

    if (apiResult.ok && Array.isArray(apiResult.moments)) {
      const merged = mergeAndSort(apiResult.moments, localMoments);
      set({ moments: merged, loading: false });
      return;
    }

    const sorted = localMoments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    set({ moments: sorted, loading: false });
  },
  addMoment: async (moment) => {
    await saveMoment(moment);
    set((s) => {
      const exists = s.moments.some((m) => m.id === moment.id);
      if (exists) return s;
      const next = [moment, ...s.moments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return { moments: next };
    });
  },
  replaceMoment: async (clientId, serverMoment) => {
    await replaceMomentStorage(clientId, serverMoment);
    set((s) => {
      const next = s.moments
        .filter((m) => m.id !== clientId)
        .concat(serverMoment)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { moments: next };
    });
  },
}));
