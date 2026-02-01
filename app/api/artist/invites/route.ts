import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { listInvitesByArtist, updateInviteStatus } from "@/app/data/invites";

export async function GET() {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const invites = listInvitesByArtist(session.userId);
    return NextResponse.json({ invites }, { status: 200 });
  } catch (e) {
    console.error("GET /api/artist/invites failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "").trim();
    const status = body?.status;
    if (!id || !["viewed", "accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const invite = listInvitesByArtist(session.userId).find((i) => i.id === id);
    if (!invite) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const updated = updateInviteStatus(id, status);
    return NextResponse.json({ invite: updated }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/artist/invites failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
