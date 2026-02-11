// ──────────────────────────────────────────
// Signed Session — HMAC-SHA256
// Prevents cookie forgery by signing session payload
// ──────────────────────────────────────────

import crypto from "crypto";

const SECRET =
  process.env.SESSION_SECRET || "rob-art-fair-platform-default-secret-change-in-production";

/**
 * Sign a session object → base64payload.hmacSignature
 */
export function signSession(data: Record<string, unknown>): string {
  const payload = JSON.stringify(data);
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

/**
 * Verify and decode a signed session string
 * Returns null if tampered or invalid
 */
export function verifySession<T = Record<string, unknown>>(
  token: string
): T | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 1) return null;

    const b64 = token.substring(0, dotIdx);
    const sig = token.substring(dotIdx + 1);

    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(b64)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }

    const payload = Buffer.from(b64, "base64url").toString();
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}
