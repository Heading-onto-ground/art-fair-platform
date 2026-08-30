import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireAdminSession = vi.fn();
const getCampaignById = vi.fn();
const getOrCreateActiveCampaign = vi.fn();
const listAdminLaborSurveyResponses = vi.fn();
const buildLaborSurveyPdf = vi.fn();

vi.mock("@/lib/apiGuards", () => ({
  requireAdminSession: () => requireAdminSession(),
}));

vi.mock("@/lib/laborSurvey", () => ({
  getCampaignById: (...args: unknown[]) => getCampaignById(...args),
  getOrCreateActiveCampaign: (...args: unknown[]) => getOrCreateActiveCampaign(...args),
  listAdminLaborSurveyResponses: (...args: unknown[]) => listAdminLaborSurveyResponses(...args),
}));

vi.mock("@/lib/laborSurveyPdf", () => ({
  buildLaborSurveyPdf: (...args: unknown[]) => buildLaborSurveyPdf(...args),
}));

import { GET } from "@/app/api/admin/labor-survey/pdf/route";

describe("GET /api/admin/labor-survey/pdf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects missing admin session", async () => {
    requireAdminSession.mockReturnValue({
      admin: null,
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    });

    const res = await GET(new Request("http://localhost/api/admin/labor-survey/pdf?campaignId=c1"));
    expect(res.status).toBe(401);
    expect(buildLaborSurveyPdf).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown campaignId", async () => {
    requireAdminSession.mockReturnValue({ admin: { email: "a@b.c" }, error: null });
    getCampaignById.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/admin/labor-survey/pdf?campaignId=missing"));
    expect(res.status).toBe(404);
    expect(buildLaborSurveyPdf).not.toHaveBeenCalled();
  });

  it("returns 400 when the campaign has no responses", async () => {
    requireAdminSession.mockReturnValue({ admin: { email: "a@b.c" }, error: null });
    getCampaignById.mockResolvedValue({ id: "c1", title: "예술인 솔직담백 수다회" });
    listAdminLaborSurveyResponses.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost/api/admin/labor-survey/pdf?campaignId=c1"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "no_responses" });
  });

  it("returns an attached PDF for a valid campaign", async () => {
    requireAdminSession.mockReturnValue({ admin: { email: "a@b.c" }, error: null });
    getCampaignById.mockResolvedValue({ id: "c1", title: "예술인 솔직담백 수다회" });
    listAdminLaborSurveyResponses.mockResolvedValue([{ id: "r1" }]);
    buildLaborSurveyPdf.mockResolvedValue({
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
      pageCount: 1,
      responseStartPages: [1],
    });

    const res = await GET(new Request("http://localhost/api/admin/labor-survey/pdf?campaignId=c1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain("labor-survey.pdf");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
