import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { upsertVerificationRequest } from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByUserId(session.userId);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json({ error: "artist profile not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const note = String(body?.note || "").trim();

    const request = await upsertVerificationRequest({
      userId: session.userId,
      artistId: profile.artistId,
      artistName: profile.name,
      email: session.email || "",
      note: note || undefined,
    });

    return NextResponse.json({ ok: true, request }, { status: 200 });
  } catch (e) {
    console.error("POST /api/artist/verification/request failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
