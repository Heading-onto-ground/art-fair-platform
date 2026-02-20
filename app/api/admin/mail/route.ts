import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { isValidEmail, sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { sendPlatformEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PlatformRole = "artist" | "gallery";
const MAIL_INTERVAL_MS = 600;
const RATE_LIMIT_RETRY_DELAY_MS = 1200;
const RATE_LIMIT_MAX_RETRIES = 3;

function dedupeEmails(values: string[]) {
  return Array.from(new Set(values.map((v) => sanitizeEmail(v)).filter(Boolean)));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeRateLimitError(error: string) {
  const msg = String(error || "").toLowerCase();
  return msg.includes("too many requests") || msg.includes("rate limit") || msg.includes("429");
}

async function resolvePlatformRecipients(input: {
  recipientMode: "all" | "selected";
  roles: PlatformRole[];
  userIds?: string[];
}) {
  const roles = (input.roles || []).filter((r): r is PlatformRole => r === "artist" || r === "gallery");
  if (!roles.length) return [];

  if (input.recipientMode === "selected") {
    const userIds = Array.isArray(input.userIds)
      ? input.userIds.map((v) => String(v || "").trim()).filter(Boolean)
      : [];
    if (!userIds.length) return [];
    const rows: Array<{ email: string }> = await prisma.user.findMany({
      where: { id: { in: userIds }, role: { in: roles } as any },
      select: { email: true },
    });
    return dedupeEmails(rows.map((r: { email: string }) => String(r.email || ""))).filter(isValidEmail);
  }

  const rows: Array<{ email: string }> = await prisma.user.findMany({
    where: { role: { in: roles } as any },
    select: { email: true },
  });
  return dedupeEmails(rows.map((r: { email: string }) => String(r.email || ""))).filter(isValidEmail);
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.targetMode || "manual").trim().toLowerCase();
    const to = sanitizeEmail(String(body?.to || ""));
    const subject = sanitizeText(String(body?.subject || ""), 180);
    const message = sanitizeText(String(body?.message || ""), 5000);
    const replyToRaw = String(body?.replyTo || "").trim();
    const replyTo = replyToRaw ? sanitizeEmail(replyToRaw) : "";

    if (!subject || !message) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    if (replyTo && !isValidEmail(replyTo)) {
      return NextResponse.json({ error: "invalid reply-to email" }, { status: 400 });
    }

    let recipients: string[] = [];
    if (mode === "platform") {
      const recipientMode = String(body?.recipientMode || "selected").trim() === "all" ? "all" : "selected";
      const rolesRaw = Array.isArray(body?.roles) ? body.roles : [];
      const roles: PlatformRole[] = rolesRaw
        .map((v: unknown) => String(v || "").trim().toLowerCase())
        .filter((v: string) => v === "artist" || v === "gallery") as PlatformRole[];
      recipients = await resolvePlatformRecipients({
        recipientMode,
        roles: roles.length ? roles : ["artist", "gallery"],
        userIds: Array.isArray(body?.userIds) ? body.userIds : [],
      });
    } else {
      if (!to || !isValidEmail(to)) {
        return NextResponse.json({ error: "invalid recipient email" }, { status: 400 });
      }
      recipients = [to];
    }

    if (!recipients.length) {
      return NextResponse.json({ error: "no recipients resolved" }, { status: 400 });
    }

    const text = `${message}\n\n---\nSent from ROB Admin Mail`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">
        <div style="white-space:pre-wrap;line-height:1.6">${message}</div>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee"/>
        <div style="font-size:12px;color:#666">Sent from ROB Admin Mail</div>
      </div>
    `;

    let sentCount = 0;
    let failedCount = 0;
    const failed: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < recipients.length; i += 1) {
      const email = recipients[i];
      if (mode === "platform" && i > 0) {
        // Resend free-tier bursts can hit 2 req/sec; keep a safe per-message interval.
        await sleep(MAIL_INTERVAL_MS);
      }

      let sent = await sendPlatformEmail({
        emailType: mode === "platform" ? "admin_platform_broadcast" : "admin_manual",
        to: email,
        subject,
        text,
        html,
        replyTo: replyTo || undefined,
        meta: {
          adminEmail: admin.email,
          targetMode: mode,
          attempt: 1,
        },
      });

      if (!sent.ok && mode === "platform" && looksLikeRateLimitError(sent.error || "")) {
        for (let attempt = 2; attempt <= RATE_LIMIT_MAX_RETRIES + 1; attempt += 1) {
          await sleep(RATE_LIMIT_RETRY_DELAY_MS);
          sent = await sendPlatformEmail({
            emailType: "admin_platform_broadcast",
            to: email,
            subject,
            text,
            html,
            replyTo: replyTo || undefined,
            meta: {
              adminEmail: admin.email,
              targetMode: mode,
              attempt,
            },
          });
          if (sent.ok || !looksLikeRateLimitError(sent.error || "")) break;
        }
      }

      if (sent.ok) sentCount += 1;
      else {
        failedCount += 1;
        failed.push({ email, error: sent.error || "send failed" });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        targetMode: mode,
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
        failedList: failed.slice(0, 20),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("POST /api/admin/mail failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

