import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

type Role = "artist" | "gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OTP_TTL_FALLBACK_MS = 10 * 60 * 1000;
const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_MAX = 20;
const OTP_MAX_ATTEMPTS = 5;
const RESET_SESSION_TTL_MS = 15 * 60 * 1000;
const COOKIE_NAME = "pwreset_session";

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const role = String(body?.role ?? "") as Role;
  const email = String(body?.email ?? "").trim().toLowerCase();
  const otp = String(body?.otp ?? "").trim();

  const ip = getClientIp(req);
  const rateKey = `pwreset:verify:${ip}:${email}:${role}`;
  const rate = consumeRateLimit({ key: rateKey, max: VERIFY_MAX, windowMs: VERIFY_WINDOW_MS });
  if (!rate.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
    return NextResponse.json({ ok: false, error: "too many attempts", retryAfterSeconds: retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  if (role !== "artist" && role !== "gallery") {
    return NextResponse.json({ ok: false, error: "invalid code" }, { status: 400 });
  }
  if (!email || !otp || otp.length !== 6) {
    return NextResponse.json({ ok: false, error: "invalid code" }, { status: 400 });
  }

  const row = await prisma.passwordResetOtp.findUnique({
    where: { email_role: { email, role } },
    select: { otpHash: true, otpExpiresAt: true, attempts: true },
  });

  const now = Date.now();
  const expiresAtMs = row?.otpExpiresAt?.getTime?.() ?? now - 1;
  if (!row || expiresAtMs < now) {
    return NextResponse.json({ ok: false, error: "invalid code" }, { status: 400 });
  }
  if ((row.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, error: "too many attempts" }, { status: 429 });
  }

  const otpHash = sha256Hex(otp);
  if (otpHash !== row.otpHash) {
    await prisma.passwordResetOtp.update({
      where: { email_role: { email, role } },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ ok: false, error: "invalid code" }, { status: 400 });
  }

  const resetSessionId = crypto.randomBytes(32).toString("hex");
  const resetSessionIdHash = sha256Hex(resetSessionId);
  const resetSessionExpiresAt = new Date(Date.now() + RESET_SESSION_TTL_MS);

  await prisma.passwordResetOtp.update({
    where: { email_role: { email, role } },
    data: {
      attempts: 0,
      otpHash: sha256Hex(crypto.randomBytes(16).toString("hex")),
      otpExpiresAt: new Date(now - (OTP_TTL_FALLBACK_MS + 1)),
      resetSessionId: resetSessionIdHash,
      resetSessionExpiresAt,
    },
  });

  const res = NextResponse.json({ ok: true }, { status: 200 });
  const isProduction = process.env.NODE_ENV === "production";
  res.cookies.set(COOKIE_NAME, resetSessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: Math.floor(RESET_SESSION_TTL_MS / 1000),
  });
  return res;
}

