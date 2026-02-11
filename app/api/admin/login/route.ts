import { NextResponse } from "next/server";
import { verifyAdminCredentials, createAdminSessionValue, ADMIN_COOKIE } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "").trim();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400 });
    }

    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    const res = NextResponse.json(
      { ok: true, session: { email, role: "admin" } },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === "production";
    res.cookies.set(ADMIN_COOKIE, createAdminSessionValue(email), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 3, // 3 days
    });

    return res;
  } catch (e) {
    console.error("POST /api/admin/login failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
