export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPlatformEmail } from "@/lib/email";
import { isCronAuthorized } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";

function isDeadlineWithinDays(deadline: string, days: number): boolean {
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return false;
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= days;
  } catch {
    return false;
  }
}

function buildHtml(openCalls: Array<{ id: string; gallery: string; theme: string; deadline: string; country: string }>): string {
  const rows = openCalls
    .map((oc) => {
      const daysLeft = Math.ceil((new Date(oc.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return `
    <tr style="border-bottom:1px solid #F0EBE3;">
      <td style="padding:14px 0;">
        <div style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#C04040;margin-bottom:3px;">D-${daysLeft} · ${oc.country}</div>
        <div style="font-size:15px;color:#1A1A1A;margin-bottom:2px;">${oc.gallery}</div>
        <div style="font-size:12px;color:#6A6660;margin-bottom:6px;">${oc.theme}</div>
        <div style="font-size:11px;color:#B0AAA2;margin-bottom:6px;">마감: ${oc.deadline}</div>
        <a href="${PLATFORM_URL}/open-calls/${oc.id}" style="font-size:10px;color:#8B7355;text-decoration:underline;">지금 지원하기 →</a>
      </td>
    </tr>`;
    })
    .join("");

  return `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;">
  <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8B7355;margin:0 0 20px;">ROB — ROLE OF BRIDGE</p>
  <h2 style="font-size:22px;font-weight:300;margin:0 0 8px;">마감이 다가오고 있습니다</h2>
  <p style="font-size:13px;color:#8A8580;margin:0 0 28px;">These open calls are closing soon</p>
  <table style="width:100%;border-collapse:collapse;">${rows}</table>
  <p style="margin-top:32px;font-size:10px;color:#C8C0B8;">ROB — Role of Bridge</p>
</div>`.trim();
}

// Cron: daily at 8am UTC
export async function GET(req: Request) {
  if (!isCronAuthorized(req, { allowAdminSession: true })) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  type OpenCallRow = { id: string; gallery: string; theme: string; deadline: string; country: string; city: string };
  const allCalls: OpenCallRow[] = await prisma.openCall.findMany({
    where: { isExternal: false },
    select: { id: true, gallery: true, theme: true, deadline: true, country: true, city: true },
  });
  const approaching: OpenCallRow[] = allCalls.filter((oc) => isDeadlineWithinDays(oc.deadline, 5));

  if (approaching.length === 0) return NextResponse.json({ ok: true, sent: 0, reason: "no deadlines approaching" });

  const artists = await prisma.user.findMany({
    where: { role: "artist" },
    select: { email: true },
  });

  // Use today's date as dedup key so reminder is sent once per day max
  const today = new Date().toISOString().slice(0, 10);
  const emailType = `deadline_reminder_${today}`;

  let sent = 0;
  for (const artist of artists) {
    if (!artist.email || artist.email.includes("@invalid.local") || artist.email.includes(".bot@")) continue;

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "EmailLog" WHERE "emailType" = $1 AND "toEmail" = $2 AND "status" = 'sent'`,
      emailType, artist.email
    )) as Array<{ count: bigint }>;
    if (Number(rows[0]?.count ?? 0) > 0) continue;

    const text = `마감이 다가오는 오픈콜:\n\n${approaching.map((oc) => {
      const d = Math.ceil((new Date(oc.deadline).getTime() - Date.now()) / 86400000);
      return `• D-${d} | ${oc.gallery} — "${oc.theme}" | 마감: ${oc.deadline}`;
    }).join("\n")}\n\n${PLATFORM_URL}/artist\n\nROB 팀`;

    await sendPlatformEmail({
      emailType,
      to: artist.email,
      subject: `ROB — 마감 임박 오픈콜 ${approaching.length}건`,
      text,
      html: buildHtml(approaching),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, approaching: approaching.length });
}

// POST: manual trigger (admin use)
export async function POST(req: Request) {
  return GET(req);
}
