import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { sendPlatformEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "contact@rob-roleofbridge.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = sanitizeText(String(body?.name || ""), 120);
    const email = sanitizeEmail(String(body?.email || ""));
    const subject = sanitizeText(String(body?.subject || ""), 180);
    const message = sanitizeText(String(body?.message || ""), 5000);

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }

    const composedSubject = `[ROB Contact] ${subject}`;
    const text = [
      "New contact form submission",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      "",
      "Message:",
      message,
    ].join("\n");
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">
        <h2 style="margin:0 0 12px 0">ROB Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p style="margin-top:16px"><strong>Message</strong></p>
        <div style="white-space:pre-wrap;border:1px solid #ddd;padding:12px;background:#fafafa">${message}</div>
      </div>
    `;

    const sent = await sendPlatformEmail({
      emailType: "contact_form",
      to: CONTACT_EMAIL,
      subject: composedSubject,
      text,
      html,
      replyTo: email,
      meta: { name, fromEmail: email },
    });
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error || "send failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/contact failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

