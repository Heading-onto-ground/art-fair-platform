import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/apiGuards";
import {
  getCampaignById,
  getOrCreateActiveCampaign,
  listAdminLaborSurveyResponses,
} from "@/lib/laborSurvey";
import { buildLaborSurveyPdf } from "@/lib/laborSurveyPdf";
import { laborSurveyPdfFilename } from "@/lib/laborSurveyPdfFilename";

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
    if (responses.length === 0) {
      return NextResponse.json({ error: "no_responses" }, { status: 400 });
    }

    const { bytes } = await buildLaborSurveyPdf({
      campaignTitle: campaign.title,
      responses,
    });
    const filename = laborSurveyPdfFilename(campaign.title);
    const asciiFallback = "labor-survey.pdf";

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/admin/labor-survey/pdf failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
