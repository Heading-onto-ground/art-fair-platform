import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { detectEmailLang, sendPlatformEmail } from "@/lib/email";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

type Role = "artist" | "gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OTP_TTL_MS = 10 * 60 * 1000;
const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const REQUEST_MAX = 5;

async function ensurePasswordResetOtpTable() {
  try {
    await prisma.$executeRawUnsafe(`SELECT 1 FROM "PasswordResetOtp" LIMIT 1`);
    return;
  } catch {
    // ignore and create below
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PasswordResetOtp" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "role" "Role" NOT NULL,
      "otpHash" TEXT NOT NULL,
      "otpExpiresAt" TIMESTAMPTZ NOT NULL,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "resetSessionId" TEXT,
      "resetSessionExpiresAt" TIMESTAMPTZ,
      CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetOtp_email_role_key"
    ON "PasswordResetOtp"("email", "role")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetOtp_resetSessionId_key"
    ON "PasswordResetOtp"("resetSessionId")
    WHERE "resetSessionId" IS NOT NULL
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PasswordResetOtp_email_idx"
    ON "PasswordResetOtp"("email")
  `);
}

function otp6() {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function buildOtpEmail(lang: "en" | "ko" | "ja" | "fr", code: string, minutes: number) {
  if (lang === "ko") {
    return {
      subject: "ROB 비밀번호 재설정 코드",
      text: `비밀번호 재설정 코드: ${code}\n\n이 코드는 ${minutes}분 후 만료됩니다.\n\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.`,
    };
  }
  if (lang === "ja") {
    return {
      subject: "ROB パスワード再設定コード",
      text: `パスワード再設定コード: ${code}\n\nこのコードは${minutes}分後に期限切れになります。\n\n心当たりがない場合は、このメールを無視してください。`,
    };
  }
  if (lang === "fr") {
    return {
      subject: "Code de reinitialisation du mot de passe ROB",
      text: `Code: ${code}\n\nCe code expire dans ${minutes} minutes.\n\nSi vous n'etes pas a l'origine de cette demande, ignorez cet email.`,
    };
  }
  return {
    subject: "ROB password reset code",
    text: `Your password reset code: ${code}\n\nThis code expires in ${minutes} minutes.\n\nIf you did not request this, you can ignore this email.`,
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const role = String(body?.role ?? "") as Role;
  const email = String(body?.email ?? "").trim().toLowerCase();

  const ip = getClientIp(req);
  const rateKey = `pwreset:req:${ip}:${email}:${role}`;
  const rate = consumeRateLimit({ key: rateKey, max: REQUEST_MAX, windowMs: REQUEST_WINDOW_MS });
  if (!rate.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
    return NextResponse.json({ ok: false, error: "too many requests", retryAfterSeconds: retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  if (role !== "artist" && role !== "gallery") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (!email) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  if (!user || user.role !== role) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await ensurePasswordResetOtpTable();

  const code = otp6();
  const otpHash = sha256Hex(code);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.passwordResetOtp.upsert({
    where: { email_role: { email, role } },
    create: {
      email,
      role,
      otpHash,
      otpExpiresAt,
      attempts: 0,
      resetSessionId: null,
      resetSessionExpiresAt: null,
    },
    update: {
      otpHash,
      otpExpiresAt,
      attempts: 0,
      resetSessionId: null,
      resetSessionExpiresAt: null,
    },
  });

  const lang = detectEmailLang(req.headers.get("accept-language"));
  const minutes = Math.floor(OTP_TTL_MS / 60000);
  const content = buildOtpEmail(lang, code, minutes);
  await sendPlatformEmail({
    emailType: "password_reset_otp",
    to: email,
    subject: content.subject,
    text: content.text,
    meta: { role, lang },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

