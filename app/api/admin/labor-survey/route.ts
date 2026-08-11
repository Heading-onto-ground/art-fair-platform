import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/apiGuards";
import {
  getOrCreateActiveCampaign,
  listAdminLaborSurveyResponses,
  listLaborSurveyCampaigns,
  updateLaborSurveyCampaign,
} from "@/lib/laborSurvey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { admin, error } = requireAdminSession();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("campaignId");
    const withResponses = url.searchParams.get("responses") === "1";

    const campaigns = await listLaborSurveyCampaigns();
    const active = campaigns.find((c) => c.isActive) ?? (await getOrCreateActiveCampaign());

    const targetId = campaignId || active.id;
    const responses = withResponses ? await listAdminLaborSurveyResponses(targetId) : [];

    return NextResponse.json({
      ok: true,
      admin: admin?.email ?? null,
      campaigns,
      activeCampaignId: active.id,
      responses,
    });
  } catch (e) {
    console.error("GET /api/admin/labor-survey failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { error } = requireAdminSession();
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    const updated = await updateLaborSurveyCampaign({
      id,
      isActive: body.isActive !== undefined ? !!body.isActive : undefined,
      title: body.title !== undefined ? String(body.title) : undefined,
      subtitle: body.subtitle !== undefined ? (body.subtitle ? String(body.subtitle) : null) : undefined,
      description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
      closesAt: body.closesAt !== undefined ? (body.closesAt ? new Date(body.closesAt) : null) : undefined,
    });

    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, campaign: updated });
  } catch (e) {
    console.error("PATCH /api/admin/labor-survey failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
