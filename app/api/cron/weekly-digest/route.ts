export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPlatformEmail } from "@/lib/email";
import { shouldSendNowForCountry } from "@/lib/globalOps";
import { isCronAuthorized } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";

function getThisMondayKey(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function isDeadlineUpcoming(deadline: string, withinDays = 30): boolean {
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return false;
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= withinDays;
  } catch {
    return false;
  }
}

function buildHtml(openCalls: Array<{ id: string; gallery: string; theme: string; deadline: string; country: string; city: string }>): string {
  const rows = openCalls
    .slice(0, 8)
    .map((oc) => {
      const daysLeft = Math.ceil((new Date(oc.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return `
    <tr style="border-bottom:1px solid #F0EBE3;">
      <td style="padding:14px 0;">
        <div style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#8B7355;margin-bottom:3px;">${oc.country}${oc.city ? " / " + oc.city : ""} · D-${daysLeft}</div>
        <div style="font-size:15px;color:#1A1A1A;margin-bottom:2px;">${oc.gallery}</div>
        <div style="font-size:12px;color:#6A6660;margin-bottom:6px;">${oc.theme}</div>
        <a href="${PLATFORM_URL}/open-calls/${oc.id}" style="font-size:10px;color:#8B7355;text-decoration:underline;">지원하기 →</a>
      </td>
    </tr>`;
    })
    .join("");

  return `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;">
  <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8B7355;margin:0 0 20px;">ROB — ROLE OF BRIDGE</p>
  <h2 style="font-size:22px;font-weight:300;margin:0 0 8px;">이번 주 오픈콜</h2>
  <p style="font-size:13px;color:#8A8580;margin:0 0 28px;">This week's open calls on ROB</p>
  <table style="width:100%;border-collapse:collapse;">${rows}</table>
  <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E8E3DB;">
    <a href="${PLATFORM_URL}/artist" style="display:inline-block;padding:12px 28px;background:#1A1A1A;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">전체 오픈콜 보기 →</a>
  </div>
  <p style="margin-top:24px;font-size:10px;color:#C8C0B8;">ROB — Role of Bridge · <a href="${PLATFORM_URL}" style="color:#8B7355;">rob-roleofbridge.com</a></p>
</div>`.trim();
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const mondayKey = getThisMondayKey();
  const emailType = `weekly_digest_${mondayKey}`;

  type OpenCallRow = { id: string; gallery: string; theme: string; deadline: string; country: string; city: string };
  const allOpenCalls: OpenCallRow[] = await prisma.openCall.findMany({
    where: { isExternal: false },
    select: { id: true, gallery: true, theme: true, deadline: true, country: true, city: true },
    orderBy: { deadline: "asc" },
  });

  const upcoming: OpenCallRow[] = allOpenCalls.filter((oc) => isDeadlineUpcoming(oc.deadline, 30));
  if (upcoming.length === 0) return NextResponse.json({ ok: true, sent: 0, reason: "no upcoming open calls" });

  const artists = await prisma.user.findMany({
    where: { role: "artist" },
    select: { email: true, artistProfile: { select: { country: true } } },
  });

  let sent = 0;
  for (const artist of artists) {
    if (!artist.email || artist.email.includes("@invalid.local") || artist.email.includes(".bot@")) continue;
    if (!shouldSendNowForCountry(new Date(), artist.artistProfile?.country || "")) continue;

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "EmailLog" WHERE "emailType" = $1 AND "toEmail" = $2 AND "status" = 'sent'`,
      emailType, artist.email
    )) as Array<{ count: bigint }>;
    if (Number(rows[0]?.count ?? 0) > 0) continue;

    const text = `이번 주 ROB 오픈콜:\n\n${upcoming.slice(0, 8).map((oc) => `• ${oc.gallery} — "${oc.theme}" | 마감: ${oc.deadline}`).join("\n")}\n\n전체 보기: ${PLATFORM_URL}/artist\n\nROB 팀`;

    await sendPlatformEmail({
      emailType,
      to: artist.email,
      subject: `ROB 주간 오픈콜 — ${upcoming.length}건의 기회`,
      text,
      html: buildHtml(upcoming),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, openCallCount: upcoming.length });
}
