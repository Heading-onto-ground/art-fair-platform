import { prisma } from "@/lib/prisma";

export type TemplateRole = "artist" | "gallery" | "curator";

let ensured = false;

export function templateKeyFromRole(role: TemplateRole) {
  if (role === "gallery") return "platform_gallery_default";
  if (role === "curator") return "platform_curator_default";
  return "platform_artist_default";
}

export function getDefaultRoleWelcomeTemplate(role: TemplateRole) {
  if (role === "gallery") {
    return {
      subject: "[ROB] Welcome, Gallery — Meet Global Artists on ROB",
      message:
        "Hello,\n\nThank you for joining ROB.\nYou can publish open calls, discover artist portfolios, and connect with artists worldwide.\n\nIf you'd like, we can help you create your first open call listing.\n\nBest regards,\nROB Team",
    };
  }
  if (role === "curator") {
    return {
      subject: "[ROB] Welcome, Curator — Connect Artists & Institutions on ROB",
      message:
        "Hello,\n\nThank you for joining ROB as a curator.\nYou can discover artists across borders, curate exhibitions, and build your network with galleries and institutions worldwide.\n\nIf you need any help getting started, reply to this email anytime.\n\nBest regards,\nROB Team",
    };
  }
  return {
    subject: "[ROB] Welcome, Artist — Your Next Opportunity Starts Here",
    message:
      "Hello,\n\nThank you for joining ROB, a global platform connecting artists and galleries.\nYou can discover open calls, apply internationally, and build your profile to be seen by galleries.\n\nIf you need help setting up your profile or portfolio, reply to this email anytime.\n\nBest regards,\nROB Team",
  };
}

export async function ensureAdminMailTemplateTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AdminMailTemplate" (
      "templateKey" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "updatedBy" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdminMailTemplate_pkey" PRIMARY KEY ("templateKey")
    );
  `);
  ensured = true;
}

export async function getRoleWelcomeTemplate(role: TemplateRole) {
  await ensureAdminMailTemplateTable();
  const templateKey = templateKeyFromRole(role);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "subject", "message"
      FROM "AdminMailTemplate"
      WHERE "templateKey" = $1
      LIMIT 1
    `,
    templateKey
  )) as Array<{ subject: string; message: string }>;
  if (rows.length > 0 && rows[0].subject && rows[0].message) {
    return rows[0];
  }
  return getDefaultRoleWelcomeTemplate(role);
}

export async function saveRoleWelcomeTemplate(input: {
  role: TemplateRole;
  subject: string;
  message: string;
  updatedBy?: string;
}) {
  await ensureAdminMailTemplateTable();
  const templateKey = templateKeyFromRole(input.role);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "AdminMailTemplate" ("templateKey", "subject", "message", "updatedBy", "updatedAt")
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT ("templateKey")
      DO UPDATE
        SET "subject" = EXCLUDED."subject",
            "message" = EXCLUDED."message",
            "updatedBy" = EXCLUDED."updatedBy",
            "updatedAt" = CURRENT_TIMESTAMP
    `,
    templateKey,
    input.subject,
    input.message,
    input.updatedBy || null
  );
}

