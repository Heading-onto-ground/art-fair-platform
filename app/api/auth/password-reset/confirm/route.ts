import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRM_WINDOW_MS = 10 * 60 * 1000;
const CONFIRM_MAX = 10;
const RESET_SESSION_TTL_MS = 15 * 60 * 1000;
const COOKIE_NAME = "pwreset_session";

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }

  const ip = getClientIp(req);
  const rateKey = `pwreset:confirm:${ip}`;
  const rate = consumeRateLimit({ key: rateKey, max: CONFIRM_MAX, windowMs: CONFIRM_WINDOW_MS });
  if (!rate.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
    return NextResponse.json({ ok: false, error: "too many requests", retryAfterSeconds: retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  const resetSessionId = req.cookies.get(COOKIE_NAME)?.value || "";
  if (!resetSessionId) {
    return NextResponse.json({ ok: false, error: "invalid session" }, { status: 400 });
  }
  const resetSessionIdHash = sha256Hex(resetSessionId);

  const body = await req.json().catch(() => null);
  const newPassword = String(body?.newPassword ?? "").trim();
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ ok: false, error: "password min 6 chars" }, { status: 400 });
  }

  const row = await prisma.passwordResetOtp.findFirst({
    where: { resetSessionId: resetSessionIdHash },
    select: { email: true, role: true, resetSessionExpiresAt: true },
  });
  const now = Date.now();
  const exp = row?.resetSessionExpiresAt?.getTime?.() ?? 0;
  if (!row || exp < now) {
    const res = NextResponse.json({ ok: false, error: "invalid session" }, { status: 400 });
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }

  const user = await prisma.user.findUnique({
    where: { email: row.email },
    select: { id: true, role: true },
  });
  if (!user || user.role !== row.role) {
    const res = NextResponse.json({ ok: false, error: "invalid session" }, { status: 400 });
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }

  const nextPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: nextPasswordHash },
    }),
    prisma.passwordResetOtp.update({
      where: { email_role: { email: row.email, role: row.role } },
      data: {
        attempts: 0,
        otpHash: sha256Hex(crypto.randomBytes(16).toString("hex")),
        otpExpiresAt: new Date(now - 1),
        resetSessionId: null,
        resetSessionExpiresAt: null,
      },
    }),
  ]);

  const res = NextResponse.json({ ok: true }, { status: 200 });
  const isProduction = process.env.NODE_ENV === "production";
  for (const name of ["afp_session", "gaff_session", COOKIE_NAME, "session", "token", "auth", "sid"]) {
    res.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 0,
    });
  }
  res.headers.set("Cache-Control", "no-store");
  return res;
}

