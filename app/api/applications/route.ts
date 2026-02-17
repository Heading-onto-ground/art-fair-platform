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

export const dynamic = "force-dynamic";

function normalizeLoose(value: string | undefined | null) {
  return String(value ?? "").trim().toLowerCase();
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
    const existing = await findApplication(openCallId, session.userId);
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
    const created = await createApplication({
      openCallId,
      galleryId: openCall.galleryId,
      artistId: session.userId,
      artistName: profile.name ?? session.userId,
      artistEmail: profile.email ?? session.userId,
      artistCountry: profile.country ?? "",
      artistCity: profile.city ?? "",
      artistPortfolioUrl: sanitizePortfolioForApplication(profile.portfolioUrl),
      message: message || undefined,
    });

    // Mark external flag on the application
    if (openCall.isExternal) {
      await setApplicationExternal(created.id);
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
      try {
        if (openCall.externalEmail) {
          await sendApplicationEmail({
            galleryEmail: openCall.externalEmail,
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
          console.log(`📧 Auto-outreach sent to ${openCall.gallery} (${openCall.externalEmail}) for artist ${artistName}`);
        }
      } catch (emailErr) {
        console.error("Auto-outreach email error (non-blocking):", emailErr);
      }

      // 발송 기록 마킹
      await markOutreachSent(created.id, `Auto-sent to ${openCall.externalEmail}`);

      // 어드민에게도 기록 알림
      await createNotification({
        userId: "ROB_ADMIN",
        type: "new_application",
        title: "AUTO OUTREACH SENT",
        message: `${artistName} applied to "${openCall.theme}" at ${openCall.gallery}. Outreach email auto-sent to ${openCall.externalEmail}.`,
        link: `/admin/outreach`,
        data: {
          applicationId: created.id,
          openCallId,
          galleryName: openCall.gallery,
          galleryEmail: openCall.externalEmail,
          artistName,
          autoSent: true,
        },
      });
    }

    return NextResponse.json({
      application: created,
    }, { status: 201 });
  } catch (e: any) {
    const detail = String(e?.message || e || "").slice(0, 400);
    console.error("POST /api/applications failed:", { stage, detail, error: e });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
