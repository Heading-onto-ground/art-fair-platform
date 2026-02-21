import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import {
  ensureAdminMailTemplateTable,
  getDefaultRoleWelcomeTemplate,
  saveRoleWelcomeTemplate,
} from "@/lib/adminMailTemplates";

export const dynamic = "force-dynamic";

type TemplateRole = "artist" | "gallery";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    await ensureAdminMailTemplateTable();
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT "templateKey", "subject", "message", "updatedBy", "updatedAt"
        FROM "AdminMailTemplate"
        WHERE "templateKey" IN ('platform_artist_default', 'platform_gallery_default')
      `
    )) as Array<{
      templateKey: string;
      subject: string;
      message: string;
      updatedBy: string | null;
      updatedAt: Date;
    }>;
    const out = {
      artist:
        rows.find((r) => r.templateKey === "platform_artist_default") ||
        getDefaultRoleWelcomeTemplate("artist"),
      gallery:
        rows.find((r) => r.templateKey === "platform_gallery_default") ||
        getDefaultRoleWelcomeTemplate("gallery"),
    };
    return NextResponse.json({ ok: true, templates: out }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/mail-templates failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const role = String(body?.role || "").trim().toLowerCase() as TemplateRole;
    if (role !== "artist" && role !== "gallery") {
      return NextResponse.json({ error: "invalid role" }, { status: 400 });
    }
    const subject = sanitizeText(String(body?.subject || ""), 180);
    const message = sanitizeText(String(body?.message || ""), 5000);
    if (!subject || !message) {
      return NextResponse.json({ error: "subject and message required" }, { status: 400 });
    }
    await saveRoleWelcomeTemplate({
      role,
      subject,
      message,
      updatedBy: admin.email,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/admin/mail-templates failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

