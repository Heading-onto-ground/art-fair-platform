import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getAdminSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    return NextResponse.json({ authenticated: true, session }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/me failed:", e);
    return NextResponse.json({ authenticated: false, error: "server error" }, { status: 500 });
  }
}
