/**
 * ROB Auth API.
 * POST /api/auth/login
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";

const SESSION_KEY = "@rob_session";

export interface Session {
  userId: string;
  role: string;
  email?: string;
}

export interface LoginResponse {
  ok: boolean;
  error?: string;
  session?: Session;
}

export async function login(
  email: string,
  password: string,
  role: "artist" | "gallery" | "curator" = "artist"
): Promise<{ ok: boolean; session?: Session; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, email: email.trim(), password }),
      credentials: "include",
    });

    const data: LoginResponse = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || `Login failed (${res.status})`,
      };
    }

    if (data.session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
      return { ok: true, session: data.session };
    }

    return { ok: false, error: "No session in response" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "Network error" };
  }
}

export async function getStoredSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
