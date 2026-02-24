import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getPinnedOpenCallId, setPinnedOpenCallId } from "@/lib/adminSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const pinnedOpenCallId = await getPinnedOpenCallId();
  return NextResponse.json({ pinnedOpenCallId }, { status: 200 });
}

export async function POST(req: Request) {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const openCallId = typeof body?.openCallId === "string" ? body.openCallId : null;
  await setPinnedOpenCallId(openCallId);
  const pinnedOpenCallId = await getPinnedOpenCallId();
  return NextResponse.json({ ok: true, pinnedOpenCallId }, { status: 200 });
}

