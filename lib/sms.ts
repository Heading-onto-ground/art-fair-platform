import { getAdminSupportSmsTo } from "@/lib/adminSettings";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";
const SUPPORT_SMS_ALERTS_ENABLED = process.env.SUPPORT_SMS_ALERTS_ENABLED === "1";
const TWILIO_ACCOUNT_SID = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
const TWILIO_AUTH_TOKEN = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
const TWILIO_FROM_NUMBER = String(process.env.TWILIO_FROM_NUMBER || "").trim();
const ADMIN_SMS_TO_FALLBACK = String(process.env.ADMIN_SMS_TO || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

function buildSupportSmsBody(userEmail: string | undefined, userId: string, messageText: string) {
  const sender = (userEmail || "").trim() || userId;
  const previewRaw = String(messageText || "").replace(/\s+/g, " ").trim();
  const preview = previewRaw.length > 80 ? `${previewRaw.slice(0, 80)}...` : previewRaw;
  return `[ROB] 가입자 쪽지 도착\n보낸 사람: ${sender}\n내용: ${preview || "-"}\n${APP_URL}/admin/support`;
}

async function sendSmsWithTwilio(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return { ok: false, error: "twilio_config_missing" };
  }
  const basic = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const payload = new URLSearchParams({
    To: to,
    From: TWILIO_FROM_NUMBER,
    Body: body,
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: String(data?.message || "twilio_send_failed") };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || "twilio_network_error") };
  }
}

export async function sendAdminSupportSmsAlert(input: {
  userId: string;
  userEmail?: string;
  messageText: string;
}) {
  const dbRecipient = await getAdminSupportSmsTo();
  const recipients = dbRecipient ? [dbRecipient] : ADMIN_SMS_TO_FALLBACK;
  const enabled = dbRecipient ? true : SUPPORT_SMS_ALERTS_ENABLED;
  if (!enabled) {
    return { ok: false, skipped: true as const, reason: "disabled" };
  }
  if (recipients.length === 0) {
    return { ok: false, skipped: true as const, reason: "no_targets" };
  }
  const body = buildSupportSmsBody(input.userEmail, input.userId, input.messageText);
  const results = await Promise.allSettled(recipients.map((to) => sendSmsWithTwilio(to, body)));
  const sent = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  const failed = results.length - sent;
  if (failed > 0) {
    console.error("Support SMS alert partial failure:", { sent, failed });
  }
  return { ok: sent > 0, sent, failed, total: results.length };
}
