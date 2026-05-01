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
    const forUser = requests.filter((r) => r.userId === session.userId);
    forUser.sort((a, b) => b.updatedAt - a.updatedAt);
    const latest = forUser[0] || null;

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
