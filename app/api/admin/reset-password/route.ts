import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setAdminPasswordHash } from "@/lib/adminSettings";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reset-password
 * One-time password reset when locked out.
 * Requires ADMIN_RESET_TOKEN env var to match.
 * Body: { token, newPassword }
 *
 * After use, remove ADMIN_RESET_TOKEN from env to disable this endpoint.
 */
export async function POST(req: Request) {
  const expectedToken = process.env.ADMIN_RESET_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json(
      { ok: false, error: "Password reset is not configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const newPassword = String(body?.newPassword ?? "").trim();

  if (!token || !newPassword) {
    return NextResponse.json(
      { ok: false, error: "Token and new password required" },
      { status: 400 }
    );
  }

  if (token !== expectedToken) {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await setAdminPasswordHash(hash);

  return NextResponse.json({
    ok: true,
    message: "Password has been reset. You can now log in with the new password. Remove ADMIN_RESET_TOKEN from env.",
  });
}
