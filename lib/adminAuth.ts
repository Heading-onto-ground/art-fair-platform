// lib/adminAuth.ts
// Separate admin authentication — uses env vars, not DB

import { cookies } from "next/headers";
import { signSession, verifySession } from "@/lib/session";

const ADMIN_COOKIE = "afp_admin_session";

// Default admin credentials (development only)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@rob-roleofbridge.com";
const LEGACY_ADMIN_EMAIL = "admin@rob.art";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "rob-admin-dev";

export type AdminSession = {
  email: string;
  role: "admin";
  isAdmin: true;
};

/** Verify admin credentials */
export function verifyAdminCredentials(email: string, password: string): boolean {
  if (process.env.NODE_ENV === "production" && !String(process.env.ADMIN_PASSWORD || "").trim()) {
    console.error("ADMIN_PASSWORD is required in production");
    return false;
  }
  const normalized = email.toLowerCase().trim();
  const matchesPrimary = normalized === ADMIN_EMAIL.toLowerCase().trim();
  const matchesLegacy = !process.env.ADMIN_EMAIL && normalized === LEGACY_ADMIN_EMAIL;
  return (
    (matchesPrimary || matchesLegacy) &&
    password === ADMIN_PASSWORD
  );
}

/** Get admin session from cookie */
export function getAdminSession(): AdminSession | null {
  try {
    const raw = cookies().get(ADMIN_COOKIE)?.value;
    if (!raw) return null;

    const verified = verifySession<AdminSession>(raw);
    if (verified && verified.isAdmin && verified.role === "admin") {
      return verified;
    }
    return null;
  } catch {
    return null;
  }
}

/** Create signed admin session cookie value */
export function createAdminSessionValue(email: string): string {
  const session: AdminSession = { email, role: "admin", isAdmin: true };
  return signSession(session as unknown as Record<string, unknown>);
}

export { ADMIN_COOKIE };
