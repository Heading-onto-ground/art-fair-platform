import { NextResponse } from "next/server";
import { getServerSession, getProfileByUserId } from "@/lib/auth";
import { getOpenCallById, listOpenCallsByGallery } from "@/app/data/openCalls";
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
      if (openCallId) {
        const openCall = await getOpenCallById(openCallId);
        if (!openCall || openCall.galleryId !== session.userId) {
          return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }
        return NextResponse.json({
          applications: await listApplicationsByOpenCall(openCallId),
        });
      }

      const galleryOpenCalls = await listOpenCallsByGallery(session.userId);
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
  try {
    const session = getServerSession();
    if (!session || session.role !== "artist") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const openCallId = String(body?.openCallId ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!openCallId) {
      return NextResponse.json({ error: "missing openCallId" }, { status: 400 });
    }

    const openCall = await getOpenCallById(openCallId);
    if (!openCall) {
      return NextResponse.json({ error: "open call not found" }, { status: 404 });
    }

    const existing = await findApplication(openCallId, session.userId);
    if (existing) {
      return NextResponse.json({ application: existing }, { status: 200 });
    }

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

    const created = await createApplication({
      openCallId,
      galleryId: openCall.galleryId,
      artistId: session.userId,
      artistName: profile.name ?? session.userId,
      artistEmail: profile.email ?? session.userId,
      artistCountry: profile.country ?? "",
      artistCity: profile.city ?? "",
      artistPortfolioUrl: profile.portfolioUrl,
      message: message || undefined,
    });

    // Mark external flag on the application
    if (openCall.isExternal) {
      await setApplicationExternal(created.id);
    }

    if (!openCall.isExternal) {
      // 내부 갤러리에게 알림 생성
      await createNotification({
        userId: openCall.galleryId,
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
  } catch (e) {
    console.error("POST /api/applications failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
