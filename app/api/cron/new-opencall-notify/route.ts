export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPlatformEmail } from "@/lib/email";
import { shouldSendNowForCountry } from "@/lib/globalOps";
import { isCronAuthorized } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";

function buildHtml(openCalls: Array<{ id: string; gallery: string; theme: string; deadline: string; country: string; city: string }>): string {
  const rows = openCalls
    .map(
      (oc) => `
    <tr style="border-bottom:1px solid #F0EBE3;">
      <td style="padding:16px 0;">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#8B7355;margin-bottom:4px;">${oc.country}${oc.city ? " / " + oc.city : ""}</div>
        <div style="font-size:16px;font-weight:400;color:#1A1A1A;margin-bottom:2px;">${oc.gallery}</div>
        <div style="font-size:12px;color:#6A6660;margin-bottom:8px;">${oc.theme}</div>
        <div style="font-size:11px;color:#B0AAA2;">마감 · ${oc.deadline}</div>
        <a href="${PLATFORM_URL}/open-calls/${oc.id}" style="display:inline-block;margin-top:8px;padding:6px 14px;border:1px solid #1A1A1A;color:#1A1A1A;text-decoration:none;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;">지원하기 →</a>
      </td>
    </tr>`
    )
    .join("");

  return `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;">
  <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8B7355;margin:0 0 20px;">ROB — ROLE OF BRIDGE</p>
  <h2 style="font-size:22px;font-weight:300;margin:0 0 8px;">새 오픈콜이 올라왔습니다</h2>
  <p style="font-size:13px;color:#8A8580;margin:0 0 28px;">New open calls just posted on ROB</p>
  <table style="width:100%;border-collapse:collapse;">${rows}</table>
  <p style="margin-top:32px;font-size:10px;color:#B0AAA2;">더 많은 오픈콜 보기: <a href="${PLATFORM_URL}/artist" style="color:#8B7355;">${PLATFORM_URL}/artist</a></p>
  <p style="margin-top:16px;font-size:10px;color:#C8C0B8;">ROB — Role of Bridge</p>
</div>`.trim();
}

function buildText(openCalls: Array<{ gallery: string; theme: string; deadline: string; country: string }>): string {
  const lines = openCalls.map((oc) => `• ${oc.gallery} — "${oc.theme}" (${oc.country}) | 마감: ${oc.deadline}`).join("\n");
  return `새 오픈콜이 올라왔습니다:\n\n${lines}\n\n전체 보기: ${PLATFORM_URL}/artist\n\nROB 팀`;
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 25 * 60 * 60 * 1000); // last 25h
  const newOpenCalls = await prisma.openCall.findMany({
    where: { createdAt: { gte: since }, isExternal: false },
    select: { id: true, gallery: true, theme: true, deadline: true, country: true, city: true },
    orderBy: { createdAt: "desc" },
  });

  if (newOpenCalls.length === 0) return NextResponse.json({ ok: true, sent: 0, reason: "no new open calls" });

  const today = new Date().toISOString().slice(0, 10);
  const emailType = `opencall_daily_notify_${today}`;

  const artists = await prisma.user.findMany({
    where: { role: "artist" },
    select: { email: true, artistProfile: { select: { name: true, country: true } } },
  });

  let sent = 0;
  for (const artist of artists) {
    if (!artist.email || artist.email.includes("@invalid.local") || artist.email.includes(".bot@")) continue;
    if (!shouldSendNowForCountry(new Date(), artist.artistProfile?.country || "")) continue;

    // Skip if already sent today
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "EmailLog" WHERE "emailType" = $1 AND "toEmail" = $2 AND "status" = 'sent'`,
      emailType, artist.email
    )) as Array<{ count: bigint }>;
    if (Number(rows[0]?.count ?? 0) > 0) continue;

    const subject = `ROB — 새 오픈콜 ${newOpenCalls.length}건이 올라왔습니다`;
    await sendPlatformEmail({
      emailType,
      to: artist.email,
      subject,
      text: buildText(newOpenCalls),
      html: buildHtml(newOpenCalls),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, newOpenCalls: newOpenCalls.length });
}
