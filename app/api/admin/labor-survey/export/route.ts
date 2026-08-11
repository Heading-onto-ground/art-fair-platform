import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/apiGuards";
import {
  getCampaignById,
  getOrCreateActiveCampaign,
  listAdminLaborSurveyResponses,
} from "@/lib/laborSurvey";
import {
  laborSurveyExportFilename,
  laborSurveyToExcelXml,
} from "@/lib/laborSurveyExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = requireAdminSession();
  if (error) return error;

  try {
    const url = new URL(req.url);
    let campaignId = url.searchParams.get("campaignId") || "";

    if (!campaignId) {
      const active = await getOrCreateActiveCampaign();
      campaignId = active.id;
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const responses = await listAdminLaborSurveyResponses(campaignId);
    const xml = laborSurveyToExcelXml(responses, "설문응답");
    const filename = laborSurveyExportFilename(campaign.title, "xls");

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/admin/labor-survey/export failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
