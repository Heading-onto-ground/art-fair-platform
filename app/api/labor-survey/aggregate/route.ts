import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/apiGuards";
import { getLaborSurveyAggregate, getOrCreateActiveCampaign } from "@/lib/laborSurvey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = requireAdminSession();
  if (error) return error;

  try {
    const url = new URL(req.url);
    let campaignId = url.searchParams.get("campaignId") || "";

    if (!campaignId) {
      const campaign = await getOrCreateActiveCampaign();
      campaignId = campaign.id;
    }

    const aggregate = await getLaborSurveyAggregate(campaignId);
    if (!aggregate) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, aggregate });
  } catch (e) {
    console.error("GET /api/labor-survey/aggregate failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
