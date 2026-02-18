import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { listEmailLogs } from "@/lib/emailLog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const limitRaw = Number(new URL(req.url).searchParams.get("limit") || "80");
    const logs = await listEmailLogs(limitRaw);
    return NextResponse.json({ ok: true, logs }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/mail-logs failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

