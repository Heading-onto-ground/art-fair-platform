import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    emailVerificationRequired:
      (process.env.EMAIL_VERIFICATION_REQUIRED || "1") !== "0",
  });
}
