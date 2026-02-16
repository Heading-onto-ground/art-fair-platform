import { NextResponse } from "next/server";
import { findUserByEmailRole, verifyPassword, createSignedSessionValue } from "@/lib/auth";
import { createOrRefreshVerificationToken, getEmailVerificationState } from "@/lib/emailVerification";
import { sendVerificationEmail } from "@/lib/email";

type Role = "artist" | "gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const EMAIL_VERIFICATION_REQUIRED = (process.env.EMAIL_VERIFICATION_REQUIRED || "1") !== "0";

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

    if (role !== "artist" && role !== "gallery") {
      return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ ok: false, error: "password required" }, { status: 400 });
    }

    const user = await findUserByEmailRole(email.toLowerCase(), role);
    if (!user || !verifyPassword(user, password)) {
      return NextResponse.json({ ok: false, error: "wrong password" }, { status: 401 });
    }
    if (EMAIL_VERIFICATION_REQUIRED) {
      const verification = await getEmailVerificationState({
        email: email.toLowerCase(),
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
              email: email.toLowerCase(),
              role,
            });
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.rob-roleofbridge.com";
            const verifyUrl = `${appUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email.toLowerCase())}&role=${encodeURIComponent(role)}`;
            const acceptLang = req.headers.get("accept-language") || "en";
            const sent = await sendVerificationEmail({
              to: email.toLowerCase(),
              role,
              verifyUrl,
              lang: acceptLang.startsWith("ko")
                ? "ko"
                : acceptLang.startsWith("ja")
                  ? "ja"
                  : acceptLang.startsWith("fr")
                    ? "fr"
                    : "en",
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
