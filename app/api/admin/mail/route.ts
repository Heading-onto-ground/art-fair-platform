import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { isValidEmail, sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { sendPlatformEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const to = sanitizeEmail(String(body?.to || ""));
    const subject = sanitizeText(String(body?.subject || ""), 180);
    const message = sanitizeText(String(body?.message || ""), 5000);
    const replyToRaw = String(body?.replyTo || "").trim();
    const replyTo = replyToRaw ? sanitizeEmail(replyToRaw) : "";

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    if (!isValidEmail(to)) {
      return NextResponse.json({ error: "invalid recipient email" }, { status: 400 });
    }
    if (replyTo && !isValidEmail(replyTo)) {
      return NextResponse.json({ error: "invalid reply-to email" }, { status: 400 });
    }

    const text = `${message}\n\n---\nSent from ROB Admin Mail`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">
        <div style="white-space:pre-wrap;line-height:1.6">${message}</div>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee"/>
        <div style="font-size:12px;color:#666">Sent from ROB Admin Mail</div>
      </div>
    `;

    const sent = await sendPlatformEmail({
      to,
      subject,
      text,
      html,
      replyTo: replyTo || undefined,
    });
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error || "send failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/admin/mail failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

