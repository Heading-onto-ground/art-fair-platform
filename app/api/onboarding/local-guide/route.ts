import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { getLocalizedOnboardingGuide } from "@/lib/globalOps";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getServerSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const profile = await getProfileByUserId(session.userId);
    const country = profile?.country || "";
    const guide = getLocalizedOnboardingGuide(country);
    return NextResponse.json({ ok: true, country, guide }, { status: 200 });
  } catch (e) {
    console.error("GET /api/onboarding/local-guide failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
