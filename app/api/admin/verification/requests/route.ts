import { NextResponse } from "next/server";
import { sendArtistVerificationRejectedEmail } from "@/lib/email";
import { getAdminSession } from "@/lib/adminAuth";
import { listVerificationRequests, reviewVerificationRequest } from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const requests = await listVerificationRequests();
    return NextResponse.json({ requests }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/verification/requests failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = getAdminSession();
    if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requestId = String(body?.requestId || "").trim();
    const action = body?.action;
    const reviewNote = String(body?.reviewNote || "").trim();
    const label = String(body?.label || "").trim();

    if (!requestId || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }

    const updated = await reviewVerificationRequest({
      requestId,
      action,
      reviewerEmail: admin.email,
      reviewNote: reviewNote || undefined,
      label: label || undefined,
    });

    if (!updated) return NextResponse.json({ error: "request not found" }, { status: 404 });

    if (action === "rejected") {
      const to = String(updated.email || "").trim();
      if (to) {
        try {
          await sendArtistVerificationRejectedEmail({
            to,
            artistName: updated.artistName || "",
            reviewNote: updated.reviewNote,
          });
        } catch (e) {
          console.error("PATCH /api/admin/verification/reject email failed:", e);
        }
      }
    }

    return NextResponse.json({ ok: true, request: updated }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/admin/verification/requests failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
