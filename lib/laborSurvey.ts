import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  AGGREGATE_FIELDS,
  DEFAULT_CAMPAIGN,
  type LaborSurveyAggregate,
  type LaborSurveyAnswers,
  type LaborSurveyCampaignPublic,
  type LaborSurveyConsent,
} from "@/lib/laborSurveyTypes";

type CampaignRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  gatheringId: string | null;
  isActive: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type ResponseRow = {
  id: string;
  campaignId: string;
  userId: string;
  artistProfileId: string | null;
  answers: LaborSurveyAnswers;
  consentResearch: boolean;
  consentPolicy: boolean;
  consentNationalAssembly: boolean;
  consentAnonymousCase: boolean;
  declineNationalAssembly: boolean;
  consentAt: Date;
  submittedAt: Date;
};

const MIN_AGGREGATE_N = 3;

function mapCampaign(row: CampaignRow): LaborSurveyCampaignPublic {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    isActive: row.isActive,
    opensAt: row.opensAt ? row.opensAt.getTime() : null,
    closesAt: row.closesAt ? row.closesAt.getTime() : null,
  };
}

function parseAnswers(raw: unknown): LaborSurveyAnswers {
  if (!raw || typeof raw !== "object") {
    throw new Error("invalid_answers");
  }
  return raw as LaborSurveyAnswers;
}

export async function ensureLaborSurveyTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LaborSurveyCampaign" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "subtitle" TEXT,
      "description" TEXT,
      "gatheringId" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "opensAt" TIMESTAMP(3),
      "closesAt" TIMESTAMP(3),
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LaborSurveyResponse" (
      "id" TEXT PRIMARY KEY,
      "campaignId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "artistProfileId" TEXT,
      "answers" JSONB NOT NULL,
      "consentResearch" BOOLEAN NOT NULL DEFAULT false,
      "consentPolicy" BOOLEAN NOT NULL DEFAULT false,
      "consentNationalAssembly" BOOLEAN NOT NULL DEFAULT false,
      "consentAnonymousCase" BOOLEAN NOT NULL DEFAULT false,
      "declineNationalAssembly" BOOLEAN NOT NULL DEFAULT false,
      "consentAt" TIMESTAMP(3) NOT NULL,
      "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      UNIQUE ("campaignId", "userId")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_labor_survey_response_campaign"
    ON "LaborSurveyResponse" ("campaignId")
  `);
}

export async function getOrCreateActiveCampaign(createdBy = "system@rob"): Promise<LaborSurveyCampaignPublic> {
  await ensureLaborSurveyTables();
  const now = new Date();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT *
      FROM "LaborSurveyCampaign"
      WHERE "isActive" = true
        AND ("opensAt" IS NULL OR "opensAt" <= $1)
        AND ("closesAt" IS NULL OR "closesAt" >= $1)
      ORDER BY "createdAt" DESC
      LIMIT 1
    `,
    now,
  )) as CampaignRow[];

  if (rows[0]) return mapCampaign(rows[0]);

  const id = crypto.randomUUID();
  const inserted = (await prisma.$queryRawUnsafe(
    `
      INSERT INTO "LaborSurveyCampaign"
      ("id", "title", "subtitle", "description", "isActive", "createdBy", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
      RETURNING *
    `,
    id,
    DEFAULT_CAMPAIGN.title,
    DEFAULT_CAMPAIGN.subtitle,
    DEFAULT_CAMPAIGN.description,
    createdBy,
  )) as CampaignRow[];
  return mapCampaign(inserted[0]);
}

export async function getCampaignById(campaignId: string): Promise<LaborSurveyCampaignPublic | null> {
  await ensureLaborSurveyTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "LaborSurveyCampaign" WHERE "id" = $1 LIMIT 1`,
    campaignId,
  )) as CampaignRow[];
  return rows[0] ? mapCampaign(rows[0]) : null;
}

export async function getMyLaborSurveyResponse(
  campaignId: string,
  userId: string,
): Promise<{ id: string; submittedAt: number; answers: LaborSurveyAnswers } | null> {
  await ensureLaborSurveyTables();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "id", "answers", "submittedAt"
      FROM "LaborSurveyResponse"
      WHERE "campaignId" = $1 AND "userId" = $2
      LIMIT 1
    `,
    campaignId,
    userId,
  )) as Array<{ id: string; answers: unknown; submittedAt: Date }>;
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    submittedAt: rows[0].submittedAt.getTime(),
    answers: parseAnswers(rows[0].answers),
  };
}

export async function submitLaborSurveyResponse(input: {
  campaignId: string;
  userId: string;
  artistProfileId?: string | null;
  answers: LaborSurveyAnswers;
  consent: LaborSurveyConsent;
}): Promise<{ id: string; submittedAt: number }> {
  await ensureLaborSurveyTables();

  const campaign = await getCampaignById(input.campaignId);
  if (!campaign || !campaign.isActive) {
    throw new Error("campaign_not_active");
  }
  const now = Date.now();
  if (campaign.closesAt && campaign.closesAt < now) throw new Error("campaign_closed");
  if (campaign.opensAt && campaign.opensAt > now) throw new Error("campaign_not_open");

  const {
    consentResearch,
    consentPolicy,
    consentNationalAssembly,
    consentAnonymousCase,
    declineNationalAssembly,
  } = input.consent;

  if (!consentResearch && !consentPolicy && !consentAnonymousCase) {
    throw new Error("consent_required");
  }
  if (consentNationalAssembly && declineNationalAssembly) {
    throw new Error("conflicting_consent");
  }

  if (
    !input.answers.field ||
    !input.answers.careerYears ||
    !input.answers.laborExperience.trim() ||
    (!input.answers.artistDisplayName.trim() && !input.answers.instagramId.trim())
  ) {
    throw new Error("required_fields_missing");
  }

  const existing = await getMyLaborSurveyResponse(input.campaignId, input.userId);
  const id = existing?.id ?? crypto.randomUUID();

  if (existing) {
    const rows = (await prisma.$queryRawUnsafe(
      `
        UPDATE "LaborSurveyResponse"
        SET
          "artistProfileId" = $3,
          "answers" = $4::jsonb,
          "consentResearch" = $5,
          "consentPolicy" = $6,
          "consentNationalAssembly" = $7,
          "consentAnonymousCase" = $8,
          "declineNationalAssembly" = $9,
          "consentAt" = NOW(),
          "submittedAt" = NOW()
        WHERE "id" = $1 AND "campaignId" = $2 AND "userId" = $10
        RETURNING "id", "submittedAt"
      `,
      id,
      input.campaignId,
      input.artistProfileId ?? null,
      JSON.stringify(input.answers),
      consentResearch,
      consentPolicy,
      consentNationalAssembly,
      consentAnonymousCase,
      declineNationalAssembly,
      input.userId,
    )) as Array<{ id: string; submittedAt: Date }>;
    return { id: rows[0].id, submittedAt: rows[0].submittedAt.getTime() };
  }

  const rows = (await prisma.$queryRawUnsafe(
    `
      INSERT INTO "LaborSurveyResponse"
      ("id", "campaignId", "userId", "artistProfileId", "answers",
       "consentResearch", "consentPolicy", "consentNationalAssembly", "consentAnonymousCase", "declineNationalAssembly",
       "consentAt", "submittedAt")
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING "id", "submittedAt"
    `,
    id,
    input.campaignId,
    input.userId,
    input.artistProfileId ?? null,
    JSON.stringify(input.answers),
    consentResearch,
    consentPolicy,
    consentNationalAssembly,
    consentAnonymousCase,
    declineNationalAssembly,
  )) as Array<{ id: string; submittedAt: Date }>;

  return { id: rows[0].id, submittedAt: rows[0].submittedAt.getTime() };
}

export async function getLaborSurveyAggregate(campaignId: string): Promise<LaborSurveyAggregate | null> {
  await ensureLaborSurveyTables();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return null;

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "answers" FROM "LaborSurveyResponse" WHERE "campaignId" = $1`,
    campaignId,
  )) as Array<{ answers: unknown }>;

  const total = rows.length;
  const items = AGGREGATE_FIELDS.map(({ key, label, yesValues }) => {
    let yesCount = 0;
    for (const row of rows) {
      try {
        const answers = parseAnswers(row.answers);
        if (yesValues.includes(String(answers[key] ?? ""))) yesCount += 1;
      } catch {
        // skip malformed
      }
    }
    const percent = total >= MIN_AGGREGATE_N ? Math.round((yesCount / total) * 100) : null;
    return { key, label, yesCount, total, percent };
  });

  return {
    campaignId,
    title: campaign.title,
    responseCount: total,
    items,
  };
}

export type AdminLaborSurveyResponse = {
  id: string;
  /** 내부 중복 제출 방지용 — 관리 UI에 노출하지 않음 */
  userId: string;
  displayName: string | null;
  instagramId: string | null;
  answers: LaborSurveyAnswers;
  consentResearch: boolean;
  consentPolicy: boolean;
  consentNationalAssembly: boolean;
  consentAnonymousCase: boolean;
  declineNationalAssembly: boolean;
  submittedAt: number;
};

export async function listAdminLaborSurveyResponses(campaignId: string): Promise<AdminLaborSurveyResponse[]> {
  await ensureLaborSurveyTables();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT r.*
      FROM "LaborSurveyResponse" r
      WHERE r."campaignId" = $1
      ORDER BY r."submittedAt" DESC
    `,
    campaignId,
  )) as ResponseRow[];

  return rows.map((row) => {
    const answers = parseAnswers(row.answers);
    return {
      id: row.id,
      userId: row.userId,
      displayName: answers.artistDisplayName?.trim() || null,
      instagramId: answers.instagramId?.trim() || null,
      answers,
      consentResearch: row.consentResearch,
      consentPolicy: row.consentPolicy,
      consentNationalAssembly: row.consentNationalAssembly,
      consentAnonymousCase: row.consentAnonymousCase,
      declineNationalAssembly: row.declineNationalAssembly,
      submittedAt: row.submittedAt.getTime(),
    };
  });
}

export async function listLaborSurveyCampaigns(): Promise<LaborSurveyCampaignPublic[]> {
  await ensureLaborSurveyTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "LaborSurveyCampaign" ORDER BY "createdAt" DESC LIMIT 50`,
  )) as CampaignRow[];
  return rows.map(mapCampaign);
}

export async function updateLaborSurveyCampaign(input: {
  id: string;
  isActive?: boolean;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  closesAt?: Date | null;
}): Promise<LaborSurveyCampaignPublic | null> {
  await ensureLaborSurveyTables();
  const current = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "LaborSurveyCampaign" WHERE "id" = $1 LIMIT 1`,
    input.id,
  )) as CampaignRow[];
  if (!current[0]) return null;

  const row = current[0];
  const next = {
    isActive: input.isActive ?? row.isActive,
    title: input.title ?? row.title,
    subtitle: input.subtitle !== undefined ? input.subtitle : row.subtitle,
    description: input.description !== undefined ? input.description : row.description,
    closesAt: input.closesAt !== undefined ? input.closesAt : row.closesAt,
  };

  const rows = (await prisma.$queryRawUnsafe(
    `
      UPDATE "LaborSurveyCampaign"
      SET
        "isActive" = $2,
        "title" = $3,
        "subtitle" = $4,
        "description" = $5,
        "closesAt" = $6,
        "updatedAt" = NOW()
      WHERE "id" = $1
      RETURNING *
    `,
    input.id,
    next.isActive,
    next.title,
    next.subtitle,
    next.description,
    next.closesAt,
  )) as CampaignRow[];
  return rows[0] ? mapCampaign(rows[0]) : null;
}
