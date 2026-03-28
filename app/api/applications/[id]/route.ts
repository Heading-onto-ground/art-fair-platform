import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  getApplicationById,
  updateApplicationShipping,
  updateApplicationStatus,
} from "@/app/data/applications";
import { getOpenCallById } from "@/app/data/openCalls";
import { createChatRoom, sendMessage } from "@/lib/chat";
import { prisma } from "@/lib/prisma";
import { sendPlatformEmail } from "@/lib/email";

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";

function fireApplicationResultEmail(artistEmail: string, artistName: string, galleryName: string, theme: string, accepted: boolean) {
  if (!artistEmail) return;
  const subject = accepted
    ? `ROB — ${galleryName} 오픈콜 합격을 축하합니다!`
    : `ROB — ${galleryName} 오픈콜 결과 안내`;
  const text = accepted
    ? `${artistName}님, ${galleryName} 오픈콜 "${theme}" 합격을 축하합니다!\n\nROB에서 갤러리와 채팅으로 배송 정보를 확인하세요.\n\n${PLATFORM_URL}/chat`
    : `${artistName}님, ${galleryName} 오픈콜 "${theme}" 결과입니다. 이번에는 함께하지 못하게 되었습니다. 다른 오픈콜에 도전해보세요.\n\n${PLATFORM_URL}/artist`;
  const html = accepted
    ? `<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;"><p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8B7355;margin:0 0 20px;">ROB — ROLE OF BRIDGE</p><h2 style="font-size:22px;font-weight:300;margin:0 0 16px;">🎉 합격을 축하합니다!</h2><p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 8px;">${artistName}님,</p><p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 24px;"><strong>${galleryName}</strong>의 오픈콜 <em>"${theme}"</em>에 합격하셨습니다. ROB 플랫폼에서 갤러리와 채팅으로 배송 정보를 확인하세요.</p><a href="${PLATFORM_URL}/chat" style="display:inline-block;padding:12px 28px;background:#1A1A1A;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">채팅 확인하기 →</a><p style="margin-top:40px;font-size:10px;color:#C8C0B8;">ROB — Role of Bridge</p></div>`
    : `<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;"><p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8B7355;margin:0 0 20px;">ROB — ROLE OF BRIDGE</p><h2 style="font-size:22px;font-weight:300;margin:0 0 16px;">오픈콜 결과 안내</h2><p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 8px;">${artistName}님,</p><p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 24px;"><strong>${galleryName}</strong>의 오픈콜 <em>"${theme}"</em>에서 이번에는 함께하지 못하게 되었습니다. 다음 기회에 다시 도전해주세요.</p><a href="${PLATFORM_URL}/artist" style="display:inline-block;padding:12px 28px;background:#1A1A1A;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">다른 오픈콜 보기 →</a><p style="margin-top:40px;font-size:10px;color:#C8C0B8;">ROB — Role of Bridge</p></div>`;
  sendPlatformEmail({ emailType: "application_result", to: artistEmail, subject, text, html }).catch(
    (e) => console.error("Application result email failed:", e)
  );
}

async function recordExhibition(app: Awaited<ReturnType<typeof getApplicationById>>, openCall: Awaited<ReturnType<typeof getOpenCallById>>) {
  if (!app || !openCall) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS artist_exhibitions (
        id TEXT PRIMARY KEY,
        "artistId" TEXT NOT NULL,
        "openCallId" TEXT NOT NULL,
        "galleryName" TEXT NOT NULL,
        theme TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        "externalUrl" TEXT,
        "acceptedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("artistId", "openCallId")
      )
    `);
    const id = `ex_${app.artistId}_${app.openCallId}`.replace(/[^a-z0-9_]/gi, "_").slice(0, 80);
    await prisma.$executeRawUnsafe(
      `INSERT INTO artist_exhibitions (id, "artistId", "openCallId", "galleryName", theme, country, city, "externalUrl")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("artistId", "openCallId") DO NOTHING`,
      id, app.artistId, app.openCallId,
      openCall.gallery, openCall.theme,
      openCall.country || "", openCall.city || "",
      openCall.externalUrl || null
    );
  } catch (e) {
    console.error("recordExhibition failed (non-blocking):", e);
  }
}

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = getServerSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const app = await getApplicationById(params.id);
    if (!app) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const shippingStatus = body?.shippingStatus;
    const shippingNote = body?.shippingNote ? String(body.shippingNote).trim() : undefined;
    const shippingCarrier = body?.shippingCarrier ? String(body.shippingCarrier).trim() : undefined;
    const trackingNumber = body?.trackingNumber ? String(body.trackingNumber).trim() : undefined;
    const trackingUrl = body?.trackingUrl ? String(body.trackingUrl).trim() : undefined;
    const status = body?.status;

    if (
      shippingStatus &&
      !["pending", "shipped", "received", "inspected", "exhibited"].includes(
        shippingStatus
      )
    ) {
      return NextResponse.json({ error: "invalid shippingStatus" }, { status: 400 });
    }

    if (status && !["submitted", "reviewing", "accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    // artists: update shipping info for their own application
    if (session.role === "artist") {
      if (app.artistId !== session.userId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (shippingStatus && shippingStatus !== "shipped") {
        return NextResponse.json({ error: "artists can only mark shipped" }, { status: 400 });
      }
      const updated = await updateApplicationShipping(params.id, {
        shippingStatus,
        shippingNote,
        shippingCarrier,
        trackingNumber,
        trackingUrl,
      });
      return NextResponse.json({ application: updated }, { status: 200 });
    }

    // galleries: update application status for their own open calls
    if (session.role === "gallery") {
      if (!status && !shippingStatus) {
        return NextResponse.json(
          { error: "missing status or shippingStatus" },
          { status: 400 }
        );
      }
      const openCall = await getOpenCallById(app.openCallId);
      if (!openCall || openCall.galleryId !== session.userId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (shippingStatus && !["received", "inspected", "exhibited"].includes(shippingStatus)) {
        return NextResponse.json({ error: "invalid shippingStatus for gallery" }, { status: 400 });
      }
      let updated = status ? await updateApplicationStatus(params.id, status) : app;

      if (shippingStatus) {
        updated = await updateApplicationShipping(params.id, { shippingStatus });
      }

      if (status === "accepted" && app.status !== "accepted") {
        const roomId = await createChatRoom(app.openCallId, app.artistId, session.userId);
        const country = openCall.country;
        const msg =
          country === "한국"
            ? `✅ ${openCall.gallery} 오픈콜 합격입니다. 배송 정보를 확인해 주세요.`
            : country === "일본"
            ? `✅ オープンコールに合格しました。配送情報をご確認ください。`
            : `✅ Your application was accepted. Please confirm shipping details.`;
        await sendMessage(roomId, session.userId, "gallery", msg);
        await recordExhibition(app, openCall);
        fireApplicationResultEmail(app.artistEmail, app.artistName, openCall.gallery, openCall.theme, true);
      }

      if (status === "rejected" && app.status !== "rejected") {
        fireApplicationResultEmail(app.artistEmail, app.artistName, openCall.gallery, openCall.theme, false);
      }

      return NextResponse.json({ application: updated }, { status: 200 });
    }

    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  } catch (e) {
    console.error("PATCH /api/applications/[id] failed:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
