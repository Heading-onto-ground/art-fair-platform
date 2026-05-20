import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOutreachUnsubscribeToken } from "@/lib/outreachUnsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = String(url.searchParams.get("token") || "").trim();
  if (!token) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }

  const verified = verifyOutreachUnsubscribeToken(token);
  if (!verified.ok) {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400 });
  }

  const email = verified.email;

  // Block future outreach to this email.
  await prisma.$executeRawUnsafe(
    `
      UPDATE "GalleryEmailDirectory"
      SET "isBlocked" = true, "updatedAt" = NOW()
      WHERE lower("email") = lower($1);
    `,
    email
  );

  // Mark latest outreach records as unsubscribed for tracking.
  await prisma.$executeRawUnsafe(
    `
      UPDATE "OutreachRecord"
      SET "status" = 'unsubscribed'
      WHERE lower("toEmail") = lower($1)
        AND "status" <> 'unsubscribed';
    `,
    email
  );

  const html = `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:40px auto;padding:24px;border:1px solid #E8E3DB;background:#fff;color:#1A1A1A;">
  <h2 style="margin:0 0 10px;font-weight:400;">Unsubscribed</h2>
  <p style="font-size:14px;line-height:1.7;color:#4A4540;">
    You have been unsubscribed from outreach emails.<br/>
    더 이상 아웃리치 이메일을 받지 않도록 처리되었습니다.
  </p>
</div>
`.trim();

  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

