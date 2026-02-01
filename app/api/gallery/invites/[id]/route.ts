import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { listInvitesByGallery, updateInviteStatus } from "@/app/data/invites";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "gallery") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const existing = listInvitesByGallery(session.userId).find(
      (i) => i.id === params.id
    );
    if (!existing) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const status = body?.status;
    if (!["sent", "viewed", "accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const updated = updateInviteStatus(params.id, status);
    return NextResponse.json({ invite: updated }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/gallery/invites/[id] failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
