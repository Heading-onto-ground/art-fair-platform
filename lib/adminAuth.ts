// lib/adminAuth.ts
// Separate admin authentication — uses DB (AdminSetting) first, then env vars

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { signSession, verifySession } from "@/lib/session";
import { getAdminPasswordHash } from "@/lib/adminSettings";

const ADMIN_COOKIE = "afp_admin_session";

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();

export type AdminSession = {
  email: string;
  role: "admin";
  isAdmin: true;
};

function isAllowedAdminEmail(email: string): boolean {
  if (!ADMIN_EMAIL) {
    if (process.env.NODE_ENV === "production") {
      console.error("ADMIN_EMAIL is required in production");
    }
    return false;
  }
  return email.toLowerCase().trim() === ADMIN_EMAIL;
}

/** Verify admin credentials (async — checks DB first, then env) */
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<boolean> {
  if (!isAllowedAdminEmail(email)) return false;

  const storedHash = await getAdminPasswordHash();
  if (storedHash) {
    return bcrypt.compareSync(password, storedHash);
  }

  if (!ADMIN_PASSWORD) {
    if (process.env.NODE_ENV === "production") {
      console.error("ADMIN_PASSWORD is required in production when no DB password is set");
    }
    return false;
  }

  return password === ADMIN_PASSWORD;
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
