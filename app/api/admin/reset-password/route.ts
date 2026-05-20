import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { setAdminPasswordHash } from "@/lib/adminSettings";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 6;

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

/**
 * POST /api/admin/reset-password
 * One-time password reset when locked out.
 * Requires ADMIN_RESET_TOKEN env var to match.
 * Body: { token, newPassword }
 *
 * After use, remove ADMIN_RESET_TOKEN from env to disable this endpoint.
 */
export async function POST(req: Request) {
  const expectedToken = process.env.ADMIN_RESET_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json(
      { ok: false, error: "Password reset is not configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const newPassword = String(body?.newPassword ?? "").trim();
  const ip = getClientIp(req);
  const rate = consumeRateLimit({
    key: `admin-reset:${ip}`,
    max: RESET_MAX_ATTEMPTS,
    windowMs: RESET_WINDOW_MS,
  });

  if (!token || !newPassword) {
    return NextResponse.json(
      { ok: false, error: "Token and new password required" },
      { status: 400 }
    );
  }

  if (!rate.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { ok: false, error: "too many attempts", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  if (!safeEqual(token, expectedToken)) {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }

  if (newPassword.length < 12) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 12 characters" },
      { status: 400 }
    );
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await setAdminPasswordHash(hash);

  return NextResponse.json({
    ok: true,
    message: "Password has been reset. You can now log in with the new password. Remove ADMIN_RESET_TOKEN from env.",
  });
}
