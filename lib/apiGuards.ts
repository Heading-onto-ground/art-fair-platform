import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getServerSession } from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export function requireAdminSession() {
  const admin = getAdminSession();
  if (!admin) {
    return { admin: null as null, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { admin, error: null as null };
}

export function requireUserSession() {
  const session = getServerSession();
  if (!session) {
    return { session: null as null, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { session, error: null as null };
}

export function enforceRateLimit(req: Request, key: string, max: number, windowMs: number) {
  const ip = getClientIp(req);
  const rate = consumeRateLimit({ key: `${key}:${ip}`, max, windowMs });
  if (rate.allowed) return null;

  const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "too many requests", retryAfterSeconds: retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
