/**
 * Day 1 verification: api/auth/me, profile.artistId, credentials
 * Used to verify auth flow in mobile.
 */

import { API_BASE_URL } from "@/constants/api";
import { logger } from "@/utils/logger";

export interface AuthMeResponse {
  session: { userId: string; role: string; email?: string } | null;
  profile: {
    artistId?: string;
    userId?: string;
    name?: string;
    role?: string;
    [k: string]: unknown;
  } | null;
  error?: string;
  details?: string;
}

export interface Day1VerificationResult {
  ok: boolean;
  authMe: AuthMeResponse;
  hasArtistId: boolean;
  hasSession: boolean;
  summary: string;
  /** HTTP status from auth/me */
  authMeStatus?: number;
  /** Full URL called */
  authMeUrl?: string;
}

export interface SelfExhibitionsResult {
  status: number;
  ok: boolean;
  count: number;
  error?: string;
  raw?: unknown;
}

const AUTH_ME_URL = `${API_BASE_URL}/api/auth/me?lite=1`;
const SELF_EXHIBITIONS_URL = `${API_BASE_URL}/api/artist/self-exhibitions`;

export interface FetchAuthMeResult {
  data: AuthMeResponse;
  status: number;
}

/**
 * Fetch /api/auth/me with credentials: include.
 */
export async function fetchAuthMe(): Promise<FetchAuthMeResult> {
  logger.debug("[Day1] fetchAuthMe", {
    url: AUTH_ME_URL,
    credentials: "include",
  });

  const res = await fetch(AUTH_ME_URL, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = (await res.json().catch(() => ({}))) as AuthMeResponse;

  logger.debug("[Day1] auth/me response", {
    status: res.status,
    ok: res.ok,
    hasSession: !!data.session,
    hasProfile: !!data.profile,
    artistId: data.profile ? (data.profile as { artistId?: string }).artistId : undefined,
  });

  if (!res.ok) {
    return {
      data: {
        session: null,
        profile: null,
        error: data.error || `HTTP ${res.status}`,
        details: data.details,
      },
      status: res.status,
    };
  }
  return { data, status: res.status };
}

/**
 * Run Day 1 verification: auth/me + artistId check.
 */
export async function runDay1Verification(): Promise<Day1VerificationResult> {
  const { data: authMe, status: authMeStatus } = await fetchAuthMe();
  const hasSession = !!authMe.session?.userId;
  const hasArtistId =
    !!authMe.profile &&
    typeof (authMe.profile as { artistId?: string }).artistId === "string" &&
    (authMe.profile as { artistId: string }).artistId.length > 0;

  let summary: string;
  if (!hasSession) {
    summary = "❌ 세션 없음 (쿠키 미전달 또는 미로그인)";
  } else if (!authMe.profile) {
    summary = "⚠️ 세션 있음, 프로필 없음 (작가 프로필 미생성?)";
  } else if (!hasArtistId) {
    summary = "⚠️ profile.artistId 없음";
  } else {
    summary = `✅ OK — artistId: ${(authMe.profile as { artistId: string }).artistId}`;
  }

  return {
    ok: hasSession && hasArtistId,
    authMe,
    hasArtistId,
    hasSession,
    summary,
    authMeStatus,
    authMeUrl: AUTH_ME_URL,
  };
}

/**
 * Fetch /api/artist/self-exhibitions with credentials: include.
 * Tests that cookies are sent for protected endpoints.
 */
export async function fetchSelfExhibitions(): Promise<SelfExhibitionsResult> {
  logger.debug("[Day1] fetchSelfExhibitions", {
    url: SELF_EXHIBITIONS_URL,
    credentials: "include",
  });

  const res = await fetch(SELF_EXHIBITIONS_URL, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({})) as { exhibitions?: unknown[]; error?: string };

  const count = Array.isArray(data.exhibitions) ? data.exhibitions.length : 0;

  logger.debug("[Day1] self-exhibitions response", {
    status: res.status,
    ok: res.ok,
    count,
    error: data.error,
  });

  return {
    status: res.status,
    ok: res.ok && !data.error,
    count,
    error: data.error,
    raw: data,
  };
}
