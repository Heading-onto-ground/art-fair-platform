import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminSession } from "@/lib/adminAuth";
import {
  getAdminPasswordHash,
  setAdminPasswordHash,
} from "@/lib/adminSettings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/change-password
 * Returns credential source info (for logged-in admin only).
 * Use POST with { currentPassword, verifyOnly: true } to verify password.
 */
export async function GET() {
  const admin = getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const storedHash = await getAdminPasswordHash();
  const source = storedHash ? "db" : "env";

  return NextResponse.json({
    ok: true,
    source,
    adminEmail: admin.email,
    message:
      source === "db"
        ? "Password is managed in Admin → Credentials. Change it there."
        : "Password is from ADMIN_PASSWORD env var. Set a password in Admin → Credentials to manage it here.",
  });
}

/**
 * POST /api/admin/change-password
 * Change admin password or verify current password.
 * Body: { currentPassword, newPassword?, verifyOnly?: boolean }
 * - verifyOnly: true — only verify currentPassword, do not change
 */
export async function POST(req: Request) {
  const admin = getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = String(body?.currentPassword ?? "").trim();
  const newPassword = String(body?.newPassword ?? "").trim();
  const verifyOnly = body?.verifyOnly === true;

  if (!currentPassword) {
    return NextResponse.json(
      { ok: false, error: "Current password required" },
      { status: 400 }
    );
  }

  const { verifyAdminCredentials } = await import("@/lib/adminAuth");
  const valid = await verifyAdminCredentials(admin.email, currentPassword);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Current password is incorrect", verified: false },
      { status: 401 }
    );
  }

  if (verifyOnly) {
    return NextResponse.json({
      ok: true,
      verified: true,
      message: "Password is correct.",
    });
  }

  if (!newPassword) {
    return NextResponse.json(
      { ok: false, error: "New password required for change" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "New password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await setAdminPasswordHash(hash);

  return NextResponse.json({
    ok: true,
    message: "Password changed. Use the new password for future logins.",
  });
}
