import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { getVerificationByUserId, listVerificationRequests } from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(session.userId);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json({ error: "artist profile not found" }, { status: 404 });
    }

    const approval = await getVerificationByUserId(session.userId);
    const requests = await listVerificationRequests();
    const latest = requests.find((r) => r.userId === session.userId) || null;

    return NextResponse.json(
      {
        verified: !!approval,
        badgeLabel: approval?.label || null,
        approvedAt: approval?.approvedAt || null,
        latestRequest: latest,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/artist/verification/status failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
