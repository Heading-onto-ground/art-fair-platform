import { NextResponse } from "next/server";
import { findUserByEmailRole, verifyPassword, createSignedSessionValue } from "@/lib/auth";

type Role = "artist" | "gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasDb = !!process.env.DATABASE_URL;
  return NextResponse.json(
    {
      ok: false,
      error: "Method Not Allowed. Use POST to log in.",
      debug: { hasDatabaseUrl: hasDb },
    },
    { status: 405, headers: { Allow: "POST" } }
  );
}

function json500(details: string) {
  return NextResponse.json(
    { ok: false, error: "server error", details },
    { status: 500 }
  );
}

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("POST /api/auth/login: DATABASE_URL is not set");
      return json500("DATABASE_URL is not set");
    }
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

    const userId = user.id;

    const res = NextResponse.json(
      { ok: true, session: { userId, role, email } },
      { status: 200 }
    );

    const isProduction = process.env.NODE_ENV === "production";
    res.cookies.set("afp_session", createSignedSessionValue({ userId, role, email }), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e) {
    console.error("POST /api/auth/login failed:", e);
    const details = e instanceof Error ? e.message : String(e) || "unknown error";
    return json500(details);
  }
}
