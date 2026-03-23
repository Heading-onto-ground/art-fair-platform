/**
 * ROB Artist Moments API.
 * GET /api/artist/moments — list my moments
 * POST /api/artist/moments — create moment
 *
 * Note: Backend uses cookie-based auth. For cross-origin mobile requests,
 * ensure the backend allows credentials and the correct origin.
 * Fallback to local storage if API fails.
 */

import { API_BASE_URL } from "@/constants/api";
import { logError } from "@/utils/logger";
import type { ArtistMoment, ReactionType } from "@/types";

export interface FetchMomentsResponse {
  ok: boolean;
  error?: string;
  moments?: ArtistMoment[];
}

const FETCH_TIMEOUT_MS = 10000;

function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

/**
 * Fetch recent moments from ALL artists (last 30 min).
 * Artists working now — public endpoint, no auth required.
 */
export async function fetchRecentMoments(): Promise<FetchMomentsResponse> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/artist/moments?recent=true`,
      { credentials: "include" }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || `Request failed (${res.status})`,
      };
    }

    const raw = Array.isArray(data.moments) ? data.moments : [];
    const moments: ArtistMoment[] = raw.map((m: Record<string, unknown>) => ({
      id: String(m.id ?? ""),
      artistId: String(m.artistId ?? ""),
      artistName: String(m.artistName ?? ""),
      imageUri: String(m.imageUri ?? m.imageUrl ?? ""),
      note: m.note != null ? String(m.note) : undefined,
      state: String(m.state ?? "working"),
      medium: String(m.medium ?? "painting"),
      createdAt: String(m.createdAt ?? new Date().toISOString()),
      reactions: (m.reactions as Record<string, number>) ?? {},
      myReaction: (m.myReaction as ReactionType | null) ?? null,
    }));

    return { ok: true, moments };
  } catch (e) {
    logError(e, "fetchRecentMoments", {
      url: `${API_BASE_URL}/api/artist/moments?recent=true`,
    });
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "Network error" };
  }
}

/**
 * Fetch artist's moments from API.
 * Returns empty array on failure (caller should fall back to local).
 */
export async function fetchMoments(): Promise<FetchMomentsResponse> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/artist/moments`,
      { method: "GET", credentials: "include" }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || `Request failed (${res.status})`,
      };
    }

    const raw = Array.isArray(data.moments) ? data.moments : [];
    const moments: ArtistMoment[] = raw.map((m: Record<string, unknown>) => ({
      id: String(m.id ?? ""),
      artistId: String(m.artistId ?? ""),
      artistName: String(m.artistName ?? ""),
      imageUri: String(m.imageUri ?? m.imageUrl ?? ""),
      note: m.note != null ? String(m.note) : undefined,
      state: String(m.state ?? "working"),
      medium: String(m.medium ?? "painting"),
      createdAt: String(m.createdAt ?? new Date().toISOString()),
    }));

    return { ok: true, moments };
  } catch (e) {
    logError(e, "fetchMoments", { url: `${API_BASE_URL}/api/artist/moments` });
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "Network error" };
  }
}

export interface CreateMomentPayload {
  note?: string;
  state: string;
  medium: string;
  imageUrl: string; // data URI or URL
}

export interface CreateMomentResponse {
  ok: boolean;
  error?: string;
  moment?: ArtistMoment;
}

/**
 * Create an artist moment via API.
 * Requires session cookie from login.
 */
export async function createMoment(
  payload: CreateMomentPayload
): Promise<CreateMomentResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/artist/moments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || `Request failed (${res.status})`,
      };
    }

    if (data.moment) {
      return {
        ok: true,
        moment: {
          id: data.moment.id,
          artistId: data.moment.artistId,
          artistName: data.moment.artistName,
          imageUri: data.moment.imageUri || data.moment.imageUrl,
          note: data.moment.note,
          state: data.moment.state,
          medium: data.moment.medium,
          createdAt: data.moment.createdAt,
        },
      };
    }

    return { ok: false, error: "No moment in response" };
  } catch (e) {
    logError(e, "createMoment", { state: payload.state, medium: payload.medium });
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "Network error" };
  }
}

export interface ReactToMomentResponse {
  ok: boolean;
  error?: string;
  action?: "added" | "updated" | "removed";
  reactionType?: ReactionType | null;
  reactions?: Record<string, number>;
}

export async function reactToMoment(
  momentId: string,
  reactionType: ReactionType
): Promise<ReactToMomentResponse> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/artist/moments/${momentId}/reactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType }),
        credentials: "include",
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || `Request failed (${res.status})`,
      };
    }

    return {
      ok: true,
      action: data.action,
      reactionType: data.reactionType ?? null,
      reactions: data.reactions ?? {},
    };
  } catch (e) {
    logError(e, "reactToMoment", { momentId, reactionType });
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "Network error" };
  }
}
