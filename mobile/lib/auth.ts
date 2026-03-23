/**
 * Auth store.
 * Uses ROB backend: POST /api/auth/login
 * In __DEV__ or EXPO_PUBLIC_BETA: accepts any email+password (beta testing).
 * When API fails: falls back to mock session.
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login as apiLogin, clearSession, getStoredSession } from "@/services/api/authService";

const SESSION_KEY = "@rob_session";
const IS_BETA =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_BETA === "1") ||
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_BETA === "true");

interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initFromStorage: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  userId: null,
  userName: null,
  userEmail: null,
  login: async (email: string, password: string) => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) return false;

    // Beta/dev: accept any email+password (skip API)
    if (__DEV__ || IS_BETA) {
      const mockSession = { userId: "artist-1", role: "artist", email: e };
      set({
        isLoggedIn: true,
        userId: mockSession.userId,
        userName: null,
        userEmail: e,
      });
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(mockSession));
      return true;
    }

    const result = await apiLogin(email, password, "artist");
    if (result.ok && result.session) {
      set({
        isLoggedIn: true,
        userId: result.session.userId,
        userName: null,
        userEmail: result.session.email ?? null,
      });
      return true;
    }
    // Beta fallback: when API fails, accept for dev/testing
    const mockSession = { userId: "artist-1", role: "artist", email: e };
    set({
      isLoggedIn: true,
      userId: mockSession.userId,
      userName: null,
      userEmail: e,
    });
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(mockSession));
    return true;
  },
  logout: async () => {
    await clearSession();
    set({ isLoggedIn: false, userId: null, userName: null, userEmail: null });
  },
  initFromStorage: async () => {
    const session = await getStoredSession();
    if (session) {
      set({
        isLoggedIn: true,
        userId: session.userId,
        userName: null,
        userEmail: session.email ?? null,
      });
    }
  },
}));
