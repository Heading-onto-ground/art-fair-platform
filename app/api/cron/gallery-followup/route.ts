export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPlatformEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";

function getCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("secret") === secret;
}

function buildHtml(galleryName: string): string {
  const signupUrl = `${PLATFORM_URL}/login?role=gallery&ref=followup`;
  return `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;">
  <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8B7355;margin:0 0 20px;">ROB — ROLE OF BRIDGE</p>
  <h2 style="font-size:22px;font-weight:300;margin:0 0 16px;">안녕하세요, ${galleryName}</h2>
  <p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 12px;">지난번 ROB 초대 이메일을 받으셨을 텐데, 아직 가입이 안 되셨더라고요.</p>
  <p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 24px;">ROB는 전 세계 작가를 연결하는 글로벌 아트 플랫폼입니다. 무료로 오픈콜을 등록하고, 지원자의 포트폴리오를 한곳에서 검토하세요.</p>
  <a href="${signupUrl}" style="display:inline-block;padding:12px 28px;background:#1A1A1A;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">무료로 시작하기 →</a>
  <p style="margin-top:40px;font-size:10px;color:#C8C0B8;">ROB — Role of Bridge · <a href="${PLATFORM_URL}" style="color:#8B7355;">rob-roleofbridge.com</a></p>
</div>`.trim();
}

export async function GET(req: Request) {
  if (!getCronAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Find outreach records sent 14-21 days ago that haven't signed up
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

  const records = await prisma.outreachRecord.findMany({
    where: {
      status: "sent",
      sentAt: { gte: twentyOneDaysAgo, lte: fourteenDaysAgo },
    },
    select: { id: true, toEmail: true, galleryName: true },
  });

  let sent = 0;
  for (const record of records) {
    if (!record.toEmail) continue;

    const emailType = `gallery_followup_${record.id}`;
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "EmailLog" WHERE "emailType" = $1 AND "status" = 'sent'`,
      emailType
    )) as Array<{ count: bigint }>;
    if (Number(rows[0]?.count ?? 0) > 0) continue;

    await sendPlatformEmail({
      emailType,
      to: record.toEmail,
      subject: `ROB — ${record.galleryName}, 아직 기회가 있습니다`,
      text: `안녕하세요, ${record.galleryName}.\n\nROB에 무료로 오픈콜을 등록하고 전 세계 작가를 만나보세요.\n\n${PLATFORM_URL}/login?role=gallery&ref=followup\n\nROB 팀`,
      html: buildHtml(record.galleryName),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
