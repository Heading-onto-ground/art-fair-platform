import { NextRequest, NextResponse } from "next/server";
import {
  listExternalApplications,
  listPendingOutreach,
  markOutreachSent,
  getApplicationById,
} from "@/app/data/applications";
import { getOpenCallById } from "@/app/data/openCalls";
import { getAdminSession } from "@/lib/adminAuth";
import { sendPlatformEmail } from "@/lib/email";
import { findBestGalleryEmail } from "@/lib/galleryEmailDirectory";

export const dynamic = "force-dynamic";

/**
 * GET — List external applications (with optional ?pending=true filter)
 */
export async function GET(req: NextRequest) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const pendingOnly = searchParams.get("pending") === "true";

    const apps = pendingOnly ? await listPendingOutreach() : await listExternalApplications();

    // Enrich with open call data
    const enriched = await Promise.all(
      apps.map(async (app) => {
        const oc = await getOpenCallById(app.openCallId);
        const fallbackEmail = oc
          ? await findBestGalleryEmail({
              galleryId: oc.galleryId,
              galleryName: oc.gallery,
              website: oc.galleryWebsite || oc.externalUrl || "",
              country: oc.country || "",
            })
          : null;
        return {
          ...app,
          galleryName: oc?.gallery ?? "Unknown",
          galleryEmail: oc?.externalEmail || fallbackEmail || "",
          galleryCity: oc?.city ?? "",
          galleryCountry: oc?.country ?? "",
          galleryWebsite: oc?.galleryWebsite ?? "",
          openCallTheme: oc?.theme ?? "",
          openCallDeadline: oc?.deadline ?? "",
        };
      })
    );

    const [allExternal, pending] = await Promise.all([
      listExternalApplications(),
      listPendingOutreach(),
    ]);
    const stats = {
      total: allExternal.length,
      pending: pending.length,
      sent: allExternal.filter((a) => a.outreachSent).length,
    };

    return NextResponse.json({ applications: enriched, stats });
  } catch (e) {
    console.error("GET /api/admin/external-apps error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

/**
 * POST — Send outreach email to external gallery
 * Body: { applicationId, customMessage? }
 */
export async function POST(req: NextRequest) {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { applicationId, customMessage } = body;

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }

    const app = await getApplicationById(applicationId);
    if (!app) {
      return NextResponse.json({ error: "application not found" }, { status: 404 });
    }

    const oc = await getOpenCallById(app.openCallId);
    if (!oc) {
      return NextResponse.json({ error: "open call not found" }, { status: 404 });
    }

    // Build outreach email content
    const fallbackEmail = await findBestGalleryEmail({
      galleryId: oc.galleryId,
      galleryName: oc.gallery,
      website: oc.galleryWebsite || oc.externalUrl || "",
      country: oc.country || "",
    });
    const galleryEmail = oc.externalEmail || fallbackEmail || "";
    const galleryName = oc.gallery;
    const artistName = app.artistName;
    const artistCountry = app.artistCountry;
    const artistCity = app.artistCity;
    const openCallTheme = oc.theme;
    const portfolioUrl = app.artistPortfolioUrl;

    const platformUrl = "https://art-fair-platform.vercel.app";

    const emailBody = customMessage || buildOutreachEmail({
      galleryName,
      artistName,
      artistCountry,
      artistCity,
      openCallTheme,
      portfolioUrl,
      platformUrl,
    });

    if (!galleryEmail || !String(galleryEmail).includes("@")) {
      return NextResponse.json({ error: "gallery email missing" }, { status: 400 });
    }

    const subject = `An artist is interested in "${openCallTheme}" — ROB Platform`;
    const sendRes = await sendPlatformEmail({
      emailType: "external_outreach",
      to: galleryEmail,
      subject,
      text: emailBody,
      html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.7">${emailBody}</div>`,
      replyTo: "contact@rob-roleofbridge.com",
      meta: {
        applicationId,
        galleryName,
        galleryEmail,
        openCallTheme,
        artistName,
      },
    });
    if (!sendRes.ok) {
      return NextResponse.json(
        { error: sendRes.error || "failed to send outreach email" },
        { status: 500 }
      );
    }

    // Mark outreach as sent
    const updated = await markOutreachSent(applicationId, `Outreach sent to ${galleryEmail}`);

    return NextResponse.json({
      ok: true,
      message: `Outreach email sent to ${galleryName} (${galleryEmail})`,
      application: updated,
      email: {
        to: galleryEmail,
        subject,
        body: emailBody,
      },
    });
  } catch (e) {
    console.error("POST /api/admin/external-apps error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

function buildOutreachEmail(data: {
  galleryName: string;
  artistName: string;
  artistCountry: string;
  artistCity: string;
  openCallTheme: string;
  portfolioUrl?: string;
  platformUrl: string;
}): string {
  return `Dear ${data.galleryName},

We are writing from ROB (Role of Bridge), a global platform connecting artists and galleries across borders.

An artist on our platform has expressed strong interest in your open call "${data.openCallTheme}":

  Artist: ${data.artistName}
  Location: ${data.artistCity}, ${data.artistCountry}
  ${data.portfolioUrl ? `Portfolio: ${data.portfolioUrl}` : ""}

ROB provides a seamless bridge between international artists and galleries — including portfolio management, real-time translation, and integrated art logistics.

We'd love for you to explore this artist's work and connect with talented creators worldwide through our platform:

  ${data.platformUrl}

By joining ROB, you can:
  - Receive curated artist applications matched to your exhibitions
  - Manage applications and communicate with artists in any language
  - Coordinate artwork shipping with integrated logistics tracking

We believe connecting with diverse international artists will enrich your program and bring fresh perspectives to your exhibitions.

Would you be open to a brief conversation about how ROB can support your gallery?

Warm regards,
ROB — Role of Bridge
${data.platformUrl}
`;
}
