import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getTemplates, updateTemplates } from "@/app/data/inviteTemplates";

export async function GET() {
  try {
    const session = getServerSession();
    if (!session || session.role !== "gallery") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const templates = await getTemplates(session.userId);
    return NextResponse.json({ templates }, { status: 200 });
  } catch (e) {
    console.error("GET /api/gallery/invite-templates failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "gallery") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const templates = await updateTemplates(session.userId, {
      korea: body?.korea ? String(body.korea) : undefined,
      japan: body?.japan ? String(body.japan) : undefined,
      global: body?.global ? String(body.global) : undefined,
    });

    return NextResponse.json({ templates }, { status: 200 });
  } catch (e) {
    console.error("POST /api/gallery/invite-templates failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
