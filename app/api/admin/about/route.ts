import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getAboutContent, saveAboutContent } from "@/lib/aboutContent";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const content = await getAboutContent();
    return NextResponse.json({ content }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/about failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const content = await saveAboutContent(body);
    return NextResponse.json({ ok: true, content }, { status: 200 });
  } catch (e) {
    console.error("POST /api/admin/about failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

