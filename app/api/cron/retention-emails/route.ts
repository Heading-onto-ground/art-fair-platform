export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPlatformEmail } from "@/lib/email";
import { isCronAuthorized } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";

function buildHtml(name?: string | null): string {
  return `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;">
  <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8B7355;margin:0 0 20px;">ROB — ROLE OF BRIDGE</p>
  <h2 style="font-size:22px;font-weight:300;margin:0 0 16px;">${name ? `${name}님,` : ""} 아직 활동이 없으시네요</h2>
  <p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 16px;">ROB 포트폴리오에 전시, 레지던시, 수상 등 활동을 기록하면 갤러리와 큐레이터가 작가님을 발견할 수 있습니다.</p>
  <p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 24px;">활동 1개만 추가해도 공개 포트폴리오가 완성됩니다.</p>
  <div style="margin-bottom:16px;">
    <a href="${PLATFORM_URL}/artist/portfolio" style="display:inline-block;padding:12px 28px;background:#1A1A1A;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-right:12px;">활동 기록하기 →</a>
    <a href="${PLATFORM_URL}/artist" style="display:inline-block;padding:11px 20px;border:1px solid #1A1A1A;color:#1A1A1A;text-decoration:none;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">오픈콜 탐색</a>
  </div>
  <p style="margin-top:40px;font-size:10px;color:#C8C0B8;">ROB — Role of Bridge · <a href="${PLATFORM_URL}" style="color:#8B7355;">rob-roleofbridge.com</a></p>
</div>`.trim();
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const emailType = "retention_30d";

  // Artists created > 30 days ago with 0 art events
  const candidates = await prisma.user.findMany({
    where: { role: "artist", createdAt: { lte: thirtyDaysAgo } },
    select: {
      email: true,
      artistProfile: {
        select: {
          name: true,
          _count: { select: { artEvents: true } },
        },
      },
    },
  });

  let sent = 0;
  for (const user of candidates) {
    if (!user.email || user.email.includes("@invalid.local") || user.email.includes(".bot@")) continue;
    if ((user.artistProfile?._count?.artEvents ?? 0) > 0) continue;

    // Send only once ever
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "EmailLog" WHERE "emailType" = $1 AND "toEmail" = $2 AND "status" = 'sent'`,
      emailType, user.email
    )) as Array<{ count: bigint }>;
    if (Number(rows[0]?.count ?? 0) > 0) continue;

    const name = user.artistProfile?.name;
    await sendPlatformEmail({
      emailType,
      to: user.email,
      subject: "ROB — 포트폴리오에 첫 활동을 기록해보세요",
      text: `${name ? `${name}님,\n\n` : ""}ROB 포트폴리오에 전시, 레지던시, 수상 등 활동을 기록하면 갤러리와 큐레이터가 찾아올 수 있습니다.\n\n${PLATFORM_URL}/artist/portfolio\n\nROB 팀`,
      html: buildHtml(name),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
