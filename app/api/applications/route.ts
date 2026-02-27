import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId, listGalleryProfiles } from "@/lib/auth";
import { getOpenCallById, listOpenCalls, listOpenCallsByGallery } from "@/app/data/openCalls";
import {
  createApplication,
  findApplication,
  listApplicationsByArtist,
  listApplicationsByOpenCall,
  markOutreachSent,
  setApplicationExternal,
} from "@/app/data/applications";
import { createNotification } from "@/app/data/notifications";
import { sendApplicationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { findBestGalleryEmail } from "@/lib/galleryEmailDirectory";

export const dynamic = "force-dynamic";

function normalizeLoose(value: string | undefined | null) {
  return String(value ?? "").trim().toLowerCase();
}

function looksLikeEmail(value: string | undefined | null) {
  const v = String(value || "").trim();
  return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function sanitizePortfolioForApplication(value?: string) {
  const v = String(value || "").trim();
  if (!v) return undefined;
  // Uploaded portfolio can be a large data URI; avoid copying huge payload into Application row.
  if (v.startsWith("data:")) return undefined;
  // Keep a conservative cap for legacy DB schemas with short text/varchar columns.
  if (v.length > 2000) return undefined;
  return v;
}

async function createApplicationLegacyFallback(input: {
  openCallId: string;
  galleryId: string;
  artistId: string;
  artistName: string;
  artistEmail: string;
  artistCountry: string;
  artistCity: string;
  artistPortfolioUrl?: string;
  message?: string;
}) {
  const cols = (await prisma.$queryRawUnsafe(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Application'
    `
  )) as Array<{ column_name: string }>;
  const colSet = new Set(cols.map((c) => String(c.column_name)));

  const values: any[] = [];
  const insertCols: string[] = [];
  const push = (column: string, value: any) => {
    insertCols.push(`"${column}"`);
    values.push(value);
  };

  // Prisma cuid() is client-side. For raw SQL fallback we provide an ID explicitly.
  const generatedId = `app_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  if (colSet.has("id")) push("id", generatedId);
  if (colSet.has("openCallId")) push("openCallId", input.openCallId);
  if (colSet.has("galleryId")) push("galleryId", input.galleryId);
  if (colSet.has("artistId")) push("artistId", input.artistId);
  if (colSet.has("artistName")) push("artistName", input.artistName);
  if (colSet.has("artistEmail")) push("artistEmail", input.artistEmail);
  if (colSet.has("artistCountry")) push("artistCountry", input.artistCountry);
  if (colSet.has("artistCity")) push("artistCity", input.artistCity);
  if (colSet.has("artistPortfolioUrl")) push("artistPortfolioUrl", input.artistPortfolioUrl ?? null);
  if (colSet.has("message")) push("message", input.message ?? null);
  if (colSet.has("status")) push("status", "submitted");
  if (colSet.has("shippingStatus")) push("shippingStatus", "pending");
  if (colSet.has("createdAt")) push("createdAt", new Date());
  if (colSet.has("updatedAt")) push("updatedAt", new Date());

  if (insertCols.length < 4) {
    throw new Error("Application fallback insert aborted: insufficient compatible columns");
  }

  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Application" (${insertCols.join(", ")}) VALUES (${placeholders})`,
    ...values
  );

  return {
    id: generatedId,
    openCallId: input.openCallId,
    galleryId: input.galleryId,
    artistId: input.artistId,
    artistName: input.artistName,
    artistEmail: input.artistEmail,
    artistCountry: input.artistCountry,
    artistCity: input.artistCity,
    artistPortfolioUrl: input.artistPortfolioUrl,
    message: input.message,
    status: "submitted" as const,
    shippingStatus: "pending" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function findApplicationLegacyFallback(openCallId: string, artistId: string) {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT *
      FROM "Application"
      WHERE "openCallId" = $1 AND "artistId" = $2
      ORDER BY "createdAt" DESC
      LIMIT 1
      `,
      openCallId,
      artistId
    )) as any[];
    const row = rows?.[0];
    if (!row) return null;
    return {
      id: row.id,
      openCallId: row.openCallId,
      galleryId: row.galleryId,
      artistId: row.artistId,
      artistName: row.artistName ?? "",
      artistEmail: row.artistEmail ?? "",
      artistCountry: row.artistCountry ?? "",
      artistCity: row.artistCity ?? "",
      artistPortfolioUrl: row.artistPortfolioUrl ?? undefined,
      message: row.message ?? undefined,
      status: (row.status ?? "submitted") as "submitted" | "reviewing" | "accepted" | "rejected",
      shippingStatus: (row.shippingStatus ?? "pending") as "pending" | "shipped" | "received" | "inspected" | "exhibited",
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
    };
  } catch {
    return null;
  }
}

async function getGalleryOwnerAliases(session: { userId: string; email?: string }) {
  const profile = await getProfileByUserId(session.userId);
  const profileGalleryId =
    profile && (profile as any).role === "gallery" ? String((profile as any).galleryId ?? "") : "";
  const profileName =
    profile && (profile as any).role === "gallery" ? String((profile as any).name ?? "") : "";

  const aliases = new Set<string>();
  if (session.userId) aliases.add(session.userId);
  if (session.email) aliases.add(session.email);
  if (profileGalleryId) aliases.add(profileGalleryId);
  if (profileName) aliases.add(profileName);
  return {
    aliases,
    normalizedAliases: new Set(Array.from(aliases).map((v) => normalizeLoose(v)).filter(Boolean)),
    profileName,
  };
}

export async function GET(req: Request) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const openCallId = searchParams.get("openCallId");

    if (session.role === "artist") {
      const mine = await listApplicationsByArtist(session.userId);
      return NextResponse.json({
        applications: openCallId
          ? mine.filter((a) => a.openCallId === openCallId)
          : mine,
      });
    }

    if (session.role === "gallery") {
      const { aliases, normalizedAliases, profileName } = await getGalleryOwnerAliases(session);
      if (openCallId) {
        const openCall = await getOpenCallById(openCallId);
        const isOwner =
          !!openCall &&
          (aliases.has(openCall.galleryId) ||
            normalizedAliases.has(normalizeLoose(openCall.galleryId)) ||
            (profileName &&
              normalizeLoose(openCall.gallery) === normalizeLoose(profileName)));
        if (!openCall || !isOwner) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        return NextResponse.json({
          applications: await listApplicationsByOpenCall(openCallId),
        });
      }

      const directGalleryOpenCalls = await listOpenCallsByGallery(session.userId);
      const allOpenCalls = await listOpenCalls();
      const byAlias = allOpenCalls.filter((oc) => {
        if (aliases.has(oc.galleryId)) return true;
        if (normalizedAliases.has(normalizeLoose(oc.galleryId))) return true;
        if (profileName && normalizeLoose(oc.gallery) === normalizeLoose(profileName)) return true;
        return false;
      });
      const mergedMap = new Map<string, (typeof allOpenCalls)[number]>();
      for (const oc of [...directGalleryOpenCalls, ...byAlias]) {
        mergedMap.set(oc.id, oc);
      }
      const galleryOpenCalls = Array.from(mergedMap.values());
      const all: any[] = [];
      for (const oc of galleryOpenCalls) {
        const list = await listApplicationsByOpenCall(oc.id);
        for (const app of list) all.push(app);
      }
      return NextResponse.json({ applications: all });
    }

    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  } catch (e) {
    console.error("GET /api/applications failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let stage = "init";
  try {
    let emailSent = false;
    let outreachReason: string | null = null;
    let outreachTargetEmail: string | null = null;

    stage = "session";
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    stage = "parse_body";
    const body = await req.json().catch(() => ({}));
    const openCallId = String(body?.openCallId ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!openCallId) {
      return NextResponse.json({ error: "missing openCallId" }, { status: 400 });
    }

    stage = "get_open_call";
    const openCall = await getOpenCallById(openCallId);
    if (!openCall) {
      return NextResponse.json({ error: "open call not found" }, { status: 404 });
    }

    stage = "find_existing";
    let existing = null;
    try {
      existing = await findApplication(openCallId, session.userId);
    } catch (existingErr) {
      // Legacy schema mismatch should not block first-time submit flow.
      console.error("findApplication failed (non-blocking):", { openCallId, artistId: session.userId, error: existingErr });
    }
    if (existing) {
      return NextResponse.json({ application: existing }, { status: 200 });
    }

    stage = "get_artist_profile";
    const profile = await getProfileByUserId(session.userId);
    if (!profile || profile.role !== "artist") {
      return NextResponse.json(
        { error: "artist profile required" },
        { status: 400 }
      );
    }
    if (!profile.portfolioUrl) {
      return NextResponse.json(
        { error: "portfolio required" },
        { status: 400 }
      );
    }

    stage = "create_application";
    const createInput = {
      openCallId,
      galleryId: openCall.galleryId,
      artistId: session.userId,
      artistName: profile.name ?? session.userId,
      artistEmail: profile.email ?? session.userId,
      artistCountry: profile.country ?? "",
      artistCity: profile.city ?? "",
      artistPortfolioUrl: sanitizePortfolioForApplication(profile.portfolioUrl),
      message: message || undefined,
    };
    let created: any;
    try {
      created = await createApplication(createInput);
    } catch (createErr: any) {
      console.error("createApplication failed; trying legacy fallback:", { openCallId, artistId: session.userId, error: createErr });
      try {
        created = await createApplicationLegacyFallback(createInput);
      } catch (fallbackErr: any) {
        const msg = String(createErr?.message || "").toLowerCase();
        const fallbackMsg = String(fallbackErr?.message || "").toLowerCase();
        const maybeDuplicate =
          msg.includes("unique") ||
          msg.includes("duplicate") ||
          fallbackMsg.includes("unique") ||
          fallbackMsg.includes("duplicate");
        if (maybeDuplicate) {
          const existed = (await findApplication(openCallId, session.userId).catch(() => null))
            ?? (await findApplicationLegacyFallback(openCallId, session.userId));
          if (existed) {
            return NextResponse.json({ application: existed }, { status: 200 });
          }
        }
        throw fallbackErr;
      }
    }

    // Mark external flag on the application
    if (openCall.isExternal) {
      try {
        await setApplicationExternal(created.id);
      } catch (externalFlagErr) {
        console.error("setApplicationExternal failed (non-blocking):", externalFlagErr);
      }
    }

    if (!openCall.isExternal) {
      // 내부 갤러리에게 알림 생성
      const targetIds = new Set<string>([openCall.galleryId]);
      try {
        const galleryProfiles = await listGalleryProfiles();
        const normalizedGalleryName = normalizeLoose(openCall.gallery);
        for (const gp of galleryProfiles) {
          const matchByGalleryId =
            normalizeLoose(gp.userId) === normalizeLoose(openCall.galleryId) ||
            normalizeLoose(gp.galleryId) === normalizeLoose(openCall.galleryId);
          const matchByName =
            !!normalizedGalleryName &&
            normalizeLoose(gp.name) === normalizedGalleryName;
          if (matchByGalleryId || matchByName) {
            targetIds.add(gp.userId);
            if (gp.galleryId) targetIds.add(gp.galleryId);
          }
        }
      } catch {
        // non-blocking
      }
      for (const targetId of targetIds) {
        try {
          await createNotification({
            userId: targetId,
            type: "new_application",
            title: "NEW APPLICATION",
            message: `${profile.name ?? session.userId} applied to "${openCall.theme}"`,
            link: `/gallery?openCallId=${openCallId}`,
            data: {
              applicationId: created.id,
              openCallId,
              artistId: session.userId,
              artistName: profile.name ?? session.userId,
            },
          });
        } catch (notifErr) {
          // Do not fail artist application when notification fanout fails.
          console.error("createNotification failed (non-blocking):", {
            targetId,
            openCallId,
            error: notifErr,
          });
        }
      }
    } else {
      // 외부 오픈콜 → 갤러리에 자동 아웃리치 이메일 발송
      const artistName = profile.name ?? session.userId;
      const platformUrl = "https://art-fair-platform.vercel.app";
      const fallbackEmail = await findBestGalleryEmail({
        galleryId: openCall.galleryId,
        galleryName: openCall.gallery,
        website: openCall.galleryWebsite || openCall.externalUrl || "",
        country: openCall.country || "",
      });
      const targetEmail = String(openCall.externalEmail || fallbackEmail || "").trim();
      const canSendOutreach = looksLikeEmail(targetEmail);
      outreachTargetEmail = canSendOutreach ? targetEmail : null;

      // instagram fallback: fetch from ExternalGalleryDirectory if email missing
      let outreachInstagram: string | null = null;
      if (!canSendOutreach) {
        try {
          const dirRow = (await prisma.$queryRawUnsafe(
            `SELECT "instagram" FROM "ExternalGalleryDirectory" WHERE "galleryId" = $1 LIMIT 1`,
            openCall.galleryId
          )) as Array<{ instagram: string | null }>;
          outreachInstagram = dirRow[0]?.instagram || null;
        } catch { /* non-blocking */ }
      }
      if (!openCall.externalEmail && canSendOutreach) {
        try {
          await prisma.openCall.update({
            where: { id: openCall.id },
            data: { externalEmail: targetEmail },
          });
        } catch (persistErr) {
          console.error("openCall externalEmail persist failed (non-blocking):", persistErr);
        }
      }

      const emailBody = `Dear ${openCall.gallery},

We are writing from ROB (Role of Bridge), a global platform connecting artists and galleries across borders.

An artist on our platform has expressed strong interest in your open call "${openCall.theme}":

  Artist: ${artistName}
  Location: ${profile.city ?? ""}, ${profile.country ?? ""}
  ${profile.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : ""}

ROB provides a seamless bridge between international artists and galleries — including portfolio management, real-time translation, and integrated art logistics.

We'd love for you to explore this artist's work and connect with talented creators worldwide through our platform:

  ${platformUrl}

By joining ROB, you can:
  - Receive curated artist applications matched to your exhibitions
  - Manage applications and communicate with artists in any language
  - Coordinate artwork shipping with integrated logistics tracking

We believe connecting with diverse international artists will enrich your program and bring fresh perspectives to your exhibitions.

Warm regards,
ROB — Role of Bridge
${platformUrl}
`;

      // 이메일 발송 (비동기, 실패해도 지원은 성공)
      if (!canSendOutreach) {
        outreachReason = "missing_external_email";
        console.warn("Auto-outreach skipped: missing/invalid external email", {
          openCallId,
          gallery: openCall.gallery,
          externalEmail: openCall.externalEmail,
        });
      } else {
        // 이메일 발송 (비동기, 실패해도 지원은 성공)
        try {
          const sent = await sendApplicationEmail({
            galleryEmail: targetEmail,
            galleryName: openCall.gallery,
            openCallTheme: openCall.theme,
            artistName,
            artistEmail: profile.email ?? session.email ?? "",
            artistCountry: profile.country ?? "",
            artistCity: profile.city ?? "",
            artistBio: profile.bio ?? undefined,
            portfolioUrl: profile.portfolioUrl ?? undefined,
            artistWebsite: profile.website ?? undefined,
            message: emailBody,
          });
          emailSent = !!sent.ok;
          outreachReason = sent.ok ? "sent" : `send_failed:${sent.error || "unknown"}`;
          if (sent.ok) {
            console.log(`📧 Auto-outreach sent to ${openCall.gallery} (${targetEmail}) for artist ${artistName}`);
          }
        } catch (emailErr) {
          outreachReason = "send_failed:exception";
          console.error("Auto-outreach email error (non-blocking):", emailErr);
        }

        if (emailSent) {
          try {
            // 발송 기록 마킹
            await markOutreachSent(created.id, `Auto-sent to ${targetEmail}`);
          } catch (markErr) {
            console.error("markOutreachSent failed (non-blocking):", markErr);
          }
        }
      }

      try {
        // 어드민에게도 기록 알림
        await createNotification({
          userId: "ROB_ADMIN",
          type: emailSent ? "new_application" : "gallery_outreach",
          title: emailSent ? "AUTO OUTREACH SENT" : "AUTO OUTREACH SKIPPED",
          message: emailSent
            ? `${artistName} applied to "${openCall.theme}" at ${openCall.gallery}. Outreach email auto-sent to ${targetEmail}.`
            : `${artistName} applied to "${openCall.theme}" at ${openCall.gallery}. Outreach skipped (${outreachReason || "unknown"}).`,
          link: `/admin/outreach`,
          data: {
            applicationId: created.id,
            openCallId,
            galleryName: openCall.gallery,
            galleryEmail: targetEmail || null,
            artistName,
            autoSent: emailSent,
            outreachReason,
          },
        });
      } catch (adminNotifErr) {
        console.error("admin createNotification failed (non-blocking):", adminNotifErr);
      }
    }

    return NextResponse.json({
      application: created,
      emailSent,
      outreach: {
        isExternal: !!openCall.isExternal,
        sent: emailSent,
        reason: outreachReason,
        targetEmail: outreachTargetEmail,
        instagram: outreachInstagram ?? undefined,
      },
    }, { status: 201 });
  } catch (e: any) {
    const detail = String(e?.message || e || "").slice(0, 400);
    console.error("POST /api/applications failed:", { stage, detail, error: e });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
