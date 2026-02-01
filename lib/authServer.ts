// lib/authServer.ts
// ✅ Server-only: cookie session using next/headers

import { cookies } from "next/headers";
import type { Session } from "@/lib/auth";

const SESSION_COOKIE = "gaff_session";

export function getServerSession(): Session | null {
  const store = cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setServerSession(session: Session) {
  const store = cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export function clearServerSession() {
  const store = cookies();
  store.delete(SESSION_COOKIE);
}
