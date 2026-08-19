import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/apiGuards";
import { sanitizeText } from "@/lib/sanitize";
import {
  getMyLaborSurveyResponse,
  getOrCreateActiveCampaign,
  submitLaborSurveyResponse,
} from "@/lib/laborSurvey";
import type { LaborSurveyAnswers, LaborSurveyConsent } from "@/lib/laborSurveyTypes";
import {
  AGE_GROUP_OPTIONS,
  FIELD_OPTIONS,
  GENDER_OPTIONS,
} from "@/lib/laborSurveyTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeAnswers(raw: Record<string, unknown>): LaborSurveyAnswers {
  const instagramRaw = sanitizeText(String(raw.instagramId || ""), 80).replace(/^@+/, "");
  const field = sanitizeText(String(raw.field || ""), 80);
  const ageGroup = sanitizeText(String(raw.ageGroup || ""), 20);
  const gender = sanitizeText(String(raw.gender || ""), 10);
  return {
    artistDisplayName: sanitizeText(String(raw.artistDisplayName || ""), 80),
    instagramId: instagramRaw ? `@${instagramRaw}` : "",
    ageGroup: AGE_GROUP_OPTIONS.includes(ageGroup) ? ageGroup : "",
    gender: GENDER_OPTIONS.includes(gender) ? gender : "",
    field: FIELD_OPTIONS.includes(field) ? field : "",
    careerYears: sanitizeText(String(raw.careerYears || ""), 40),
    employmentType: sanitizeText(String(raw.employmentType || ""), 80),
    isFreelancer: (["yes", "no", "mixed"].includes(String(raw.isFreelancer))
      ? String(raw.isFreelancer)
      : "no") as LaborSurveyAnswers["isFreelancer"],
    activityForms: sanitizeText(String(raw.activityForms || ""), 500),
    hasWrittenContract: (["always", "sometimes", "rarely", "never"].includes(String(raw.hasWrittenContract))
      ? String(raw.hasWrittenContract)
      : "sometimes") as LaborSurveyAnswers["hasWrittenContract"],
    contractTiming: (["before", "after", "mixed", "none"].includes(String(raw.contractTiming))
      ? String(raw.contractTiming)
      : "mixed") as LaborSurveyAnswers["contractTiming"],
    noContractReceived: raw.noContractReceived === "yes" ? "yes" : "no",
    verbalThenWritten: raw.verbalThenWritten === "yes" ? "yes" : "no",
    payCutOrDelay: raw.payCutOrDelay === "yes" ? "yes" : "no",
    responseToUnfair: sanitizeText(String(raw.responseToUnfair || ""), 2000),
    hardToAskContract: raw.hardToAskContract === "yes" ? "yes" : "no",
    hardToAskContractReason: sanitizeText(String(raw.hardToAskContractReason || ""), 1000),
    fearRetaliation: raw.fearRetaliation === "yes" ? "yes" : "no",
    laborExperience: sanitizeText(String(raw.laborExperience || ""), 5000),
  };
}

function parseConsent(raw: Record<string, unknown>): LaborSurveyConsent {
  return {
    consentResearch: !!raw.consentResearch,
    consentPolicy: !!raw.consentPolicy,
    consentNationalAssembly: !!raw.consentNationalAssembly,
    consentAnonymousCase: !!raw.consentAnonymousCase,
    declineNationalAssembly: !!raw.declineNationalAssembly,
  };
}

export async function GET() {
  try {
    const campaign = await getOrCreateActiveCampaign();
    const session = getServerSession();

    let mine = null;

    if (session?.userId) {
      mine = await getMyLaborSurveyResponse(campaign.id, session.userId);
    }

    return NextResponse.json({
      ok: true,
      campaign,
      session: session ? { role: session.role, userId: session.userId } : null,
      mine,
    });
  } catch (e) {
    console.error("GET /api/labor-survey failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rateLimited = enforceRateLimit(req, "labor-survey-submit", 8, 60_000);
    if (rateLimited) return rateLimited;

    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "artist_only" }, { status: 401 });
    }

    const profile = await getProfileByUserId(session.userId);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json({ error: "artist_profile_required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const campaignId = String(body?.campaignId || "");
    if (!campaignId) {
      return NextResponse.json({ error: "campaign_id_required" }, { status: 400 });
    }

    const answers = sanitizeAnswers(body?.answers || {});
    const consent = parseConsent(body?.consent || {});

    const result = await submitLaborSurveyResponse({
      campaignId,
      userId: session.userId,
      artistProfileId: profile.id ?? null,
      answers,
      consent,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "server error";
    if (
      msg === "campaign_not_active" ||
      msg === "campaign_closed" ||
      msg === "campaign_not_open" ||
      msg === "consent_required" ||
      msg === "conflicting_consent" ||
      msg === "required_fields_missing"
    ) {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
    console.error("POST /api/labor-survey failed:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
