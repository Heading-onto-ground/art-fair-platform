export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPlatformEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";

function getCronAuth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${cronSecret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === cronSecret;
}

const STEPS = [
  { days: 1, emailType: "onboarding_d1" },
  { days: 3, emailType: "onboarding_d3" },
  { days: 7, emailType: "onboarding_d7" },
];

function buildSubject(days: number): string {
  if (days === 1) return "ROB — 첫 활동을 기록해보세요";
  if (days === 3) return "ROB — 프로필을 완성해보세요";
  return "ROB — 글로벌 오픈콜에서 기회를 찾아보세요";
}

function buildText(days: number, name?: string | null): string {
  const g = name ? `안녕하세요, ${name}님.` : "안녕하세요.";
  if (days === 1)
    return `${g}\n\nROB에 오신 걸 환영합니다.\n전시, 레지던시, 수상 등 활동을 1개만 기록하면 공개 포트폴리오가 완성됩니다.\n갤러리와 큐레이터가 작가님을 발견할 수 있어요.\n\n${PLATFORM_URL}/artist/portfolio\n\nROB 팀`;
  if (days === 3)
    return `${g}\n\n프로필을 완성해보세요.\n프로필 사진, 소개(Bio), 작업 노트, 활동 타임라인을 추가하면 훨씬 인상적으로 보입니다.\n\n${PLATFORM_URL}/artist/portfolio\n\nROB 팀`;
  return `${g}\n\nROB의 오픈콜에서 글로벌 기회를 찾아보세요.\n합격하면 전시 이력이 포트폴리오에 자동으로 추가됩니다.\n\n${PLATFORM_URL}/artist\n\nROB 팀`;
}

function buildHtml(days: number, name?: string | null): string {
  const g = name ? `안녕하세요, ${name}님.` : "안녕하세요.";
  const ctaUrl = days === 7 ? `${PLATFORM_URL}/artist` : `${PLATFORM_URL}/artist/portfolio`;
  const ctaLabel = days === 7 ? "오픈콜 탐색하기 →" : days === 3 ? "프로필 완성하기 →" : "포트폴리오 작성하기 →";

  const bodyTexts: Record<number, string> = {
    1: "ROB에 오신 걸 환영합니다. 전시, 레지던시, 수상 등 활동을 1개만 기록하면 공개 포트폴리오가 완성됩니다. 갤러리와 큐레이터가 작가님을 발견할 수 있어요.",
    3: "프로필 사진, 아티스트 소개(Bio), 작업 노트, 활동 타임라인을 추가하면 갤러리와 큐레이터에게 훨씬 인상적으로 보입니다.",
    7: "ROB에는 전 세계 갤러리의 오픈콜이 올라옵니다. 지금 바로 지원해보세요. 합격하면 전시 이력이 포트폴리오에 자동으로 추가됩니다.",
  };

  return `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;">
  <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8B7355;margin:0 0 20px;">ROB — ROLE OF BRIDGE</p>
  <h2 style="font-size:22px;font-weight:300;margin:0 0 16px;">${buildSubject(days).replace("ROB — ", "")}</h2>
  <p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 8px;">${g}</p>
  <p style="font-size:14px;line-height:1.8;color:#4A4540;margin:0 0 24px;">${bodyTexts[days]}</p>
  <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background:#1A1A1A;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">${ctaLabel}</a>
  <p style="margin-top:40px;font-size:11px;color:#B0AAA2;">ROB — Role of Bridge · <a href="${PLATFORM_URL}" style="color:#8B7355;">rob-roleofbridge.com</a></p>
</div>`.trim();
}

export async function GET(req: Request) {
  if (!getCronAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, number> = {};
  const now = new Date();

  for (const step of STEPS) {
    const halfWindow = 12 * 60 * 60 * 1000;
    const targetMs = step.days * 24 * 60 * 60 * 1000;
    const windowStart = new Date(now.getTime() - targetMs - halfWindow);
    const windowEnd = new Date(now.getTime() - targetMs + halfWindow);

    const users = await prisma.user.findMany({
      where: { role: "artist", createdAt: { gte: windowStart, lte: windowEnd } },
      select: { id: true, email: true, artistProfile: { select: { name: true } } },
    });

    let sent = 0;
    for (const user of users) {
      if (!user.email || user.email.includes("@invalid.local") || user.email.includes(".bot@")) continue;

      // Skip if already sent
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM "EmailLog" WHERE "emailType" = $1 AND "toEmail" = $2 AND "status" = 'sent'`,
        step.emailType,
        user.email
      );
      if (Number(rows[0]?.count ?? 0) > 0) continue;

      await sendPlatformEmail({
        emailType: step.emailType,
        to: user.email,
        subject: buildSubject(step.days),
        text: buildText(step.days, user.artistProfile?.name),
        html: buildHtml(step.days, user.artistProfile?.name),
      });
      sent++;
    }
    results[`d${step.days}`] = sent;
  }

  return NextResponse.json({ ok: true, results });
}
