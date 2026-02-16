import { NextResponse } from "next/server";
import { findUserByEmailRole } from "@/lib/auth";
import { sendVerificationEmail, detectEmailLang } from "@/lib/email";
import { createOrRefreshVerificationToken, getEmailVerificationState } from "@/lib/emailVerification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "artist" | "gallery";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "").trim() as Role;
    const lang = String(body?.lang || "en");

    if (!email || (role !== "artist" && role !== "gallery")) {
      return NextResponse.json(
        { ok: false, error: "invalid request" },
        { status: 400 }
      );
    }

    const user = await findUserByEmailRole(email, role);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "user not found" },
        { status: 404 }
      );
    }

    const state = await getEmailVerificationState({ email, role });
    if (state.exists && state.verified) {
      return NextResponse.json({ ok: true, message: "already verified" });
    }

    const { token } = await createOrRefreshVerificationToken({ email, role });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.rob-roleofbridge.com";
    const verifyUrl = `${appUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`;

    const sent = await sendVerificationEmail({
      to: email,
      role,
      verifyUrl,
      lang: detectEmailLang(lang),
    });
    if (!sent.ok) {
      return NextResponse.json(
        { ok: false, error: sent.error || "failed to send email" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/auth/verify/resend failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

