import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_MAX_AGE_DAYS = 365;

function getSecret(): string {
  return String(process.env.OUTREACH_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "").trim();
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createOutreachUnsubscribeToken(email: string, issuedAtMs = Date.now()): string {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const secret = getSecret();
  if (!normalizedEmail || !secret) return "";
  const payload = `${normalizedEmail}.${issuedAtMs}`;
  const sig = signPayload(payload, secret);
  return Buffer.from(`${payload}.${sig}`, "utf-8").toString("base64url");
}

export function verifyOutreachUnsubscribeToken(token: string): { ok: true; email: string } | { ok: false; error: string } {
  try {
    const secret = getSecret();
    if (!secret) return { ok: false, error: "missing secret" };
    const raw = Buffer.from(String(token || ""), "base64url").toString("utf-8");
    const parts = raw.split(".");
    if (parts.length < 3) return { ok: false, error: "invalid token format" };
    const sig = String(parts.pop() || "");
    const issuedAtRaw = String(parts.pop() || "");
    const email = parts.join(".").trim().toLowerCase();
    const issuedAt = Number(issuedAtRaw);
    if (!email || !Number.isFinite(issuedAt)) return { ok: false, error: "invalid token payload" };

    const payload = `${email}.${issuedAt}`;
    const expectedSig = signPayload(payload, secret);
    const sigOk =
      sig.length === expectedSig.length &&
      timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"));
    if (!sigOk) return { ok: false, error: "signature mismatch" };

    const maxAgeMs = DEFAULT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - issuedAt > maxAgeMs) return { ok: false, error: "token expired" };

    return { ok: true, email };
  } catch {
    return { ok: false, error: "token parse failed" };
  }
}

