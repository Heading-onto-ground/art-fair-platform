import { NextResponse } from "next/server";
import { findUserByEmailRole, verifyPassword, createSignedSessionValue } from "@/lib/auth";
import { createOrRefreshVerificationToken, getEmailVerificationState } from "@/lib/emailVerification";
import { sendVerificationEmail, detectEmailLang } from "@/lib/email";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/rateLimit";

type Role = "artist" | "gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const EMAIL_VERIFICATION_REQUIRED = true;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

export async function GET() {
  const hasDb = !!process.env.DATABASE_URL;
  return NextResponse.json(
    {
      ok: false,
      error: "Method Not Allowed. Use POST to log in.",
      debug: { hasDatabaseUrl: hasDb },
    },
    { status: 405, headers: { Allow: "POST" } }
  );
}

function json500(details: string) {
  return NextResponse.json(
    { ok: false, error: "server error", details },
    { status: 500 }
  );
}

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("POST /api/auth/login: DATABASE_URL is not set");
      return json500("DATABASE_URL is not set");
    }
    const body = await req.json().catch(() => null);

    const role = String(body?.role ?? "") as Role;
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "").trim();
    const emailLower = email.toLowerCase();
    const ip = getClientIp(req);
    const rateKey = `auth-login:${ip}:${emailLower}:${role}`;

    if (role !== "artist" && role !== "gallery") {
      return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ ok: false, error: "password required" }, { status: 400 });
    }

    const rate = consumeRateLimit({
      key: rateKey,
      max: LOGIN_MAX_ATTEMPTS,
      windowMs: LOGIN_WINDOW_MS,
    });
    if (!rate.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { ok: false, error: "too many login attempts", retryAfterSeconds: retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const user = await findUserByEmailRole(emailLower, role);
    if (!user || !verifyPassword(user, password)) {
      return NextResponse.json({ ok: false, error: "wrong password" }, { status: 401 });
    }
    if (EMAIL_VERIFICATION_REQUIRED) {
      const verification = await getEmailVerificationState({
        email: emailLower,
        role,
      });
      if (verification.exists && !verification.verified) {
        let autoResent = false;
        let resendError: string | null = null;
        const now = Date.now();
        const lastUpdatedAt = verification.updatedAt?.getTime?.() || 0;
        const cooldownPassed = now - lastUpdatedAt >= RESEND_COOLDOWN_MS;
        const shouldResend = verification.expired || cooldownPassed;

        if (shouldResend) {
          try {
            const { token } = await createOrRefreshVerificationToken({
              email: emailLower,
              role,
            });
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";
            const verifyUrl = `${appUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailLower)}&role=${encodeURIComponent(role)}`;
            const acceptLang = req.headers.get("accept-language");
            const sent = await sendVerificationEmail({
              to: emailLower,
              role,
              verifyUrl,
              lang: detectEmailLang(acceptLang),
            });
            autoResent = !!sent.ok;
            if (!sent.ok) resendError = sent.error || "failed to send verification email";
          } catch (e: any) {
            resendError = e?.message || "failed to send verification email";
          }
        }

        return NextResponse.json(
          {
            ok: false,
            error: "email not verified",
            verificationReason: verification.expired ? "expired" : "pending",
            autoResent,
            resendError,
          },
          { status: 403 }
        );
      }
    }

    const userId = user.id;
    clearRateLimit(rateKey);

    const res = NextResponse.json(
      { ok: true, session: { userId, role, email } },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === "production";
    res.cookies.set("afp_session", createSignedSessionValue({ userId, role, email }), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e) {
    console.error("POST /api/auth/login failed:", e);
    const details = e instanceof Error ? e.message : String(e) || "unknown error";
    return json500(details);
  }
}
