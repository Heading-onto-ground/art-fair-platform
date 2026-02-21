import { NextResponse } from "next/server";
import { verifyAdminCredentials, createAdminSessionValue, ADMIN_COOKIE } from "@/lib/adminAuth";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ADMIN_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const ADMIN_LOGIN_MAX_ATTEMPTS = 8;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "").trim();
    const ip = getClientIp(req);
    const rateKey = `admin-login:${ip}:${email.toLowerCase()}`;

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400 });
    }

    const rate = consumeRateLimit({
      key: rateKey,
      max: ADMIN_LOGIN_MAX_ATTEMPTS,
      windowMs: ADMIN_LOGIN_WINDOW_MS,
    });
    if (!rate.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { ok: false, error: "too many login attempts", retryAfterSeconds: retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }
    clearRateLimit(rateKey);

    const res = NextResponse.json(
      { ok: true, session: { email, role: "admin" } },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === "production";
    res.cookies.set(ADMIN_COOKIE, createAdminSessionValue(email), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 3, // 3 days
    });

    return res;
  } catch (e) {
    console.error("POST /api/admin/login failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
