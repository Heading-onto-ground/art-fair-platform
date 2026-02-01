import { NextResponse } from "next/server";
import { findUserByEmailRole, verifyPassword } from "@/lib/auth";

type Role = "artist" | "gallery";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const role = String(body?.role ?? "") as Role;
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "").trim();

    if (role !== "artist" && role !== "gallery") {
      return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ ok: false, error: "password required" }, { status: 400 });
    }

    const user = await findUserByEmailRole(email.toLowerCase(), role);
    if (!user || !verifyPassword(user, password)) {
      return NextResponse.json({ ok: false, error: "wrong password" }, { status: 401 });
    }

    // userId 만들기 (MVP)
    const userId = user.id;

    const res = NextResponse.json(
      { ok: true, session: { userId, role, email } },
      { status: 200 }
    );

    // ✅ 쿠키 저장
    res.cookies.set("afp_session", JSON.stringify({ userId, role, email }), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e) {
    console.error("POST /api/auth/login failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
