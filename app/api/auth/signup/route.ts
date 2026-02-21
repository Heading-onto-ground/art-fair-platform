import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail, detectEmailLang, sendPlatformEmail } from "@/lib/email";
import { createOrRefreshVerificationToken } from "@/lib/emailVerification";
import { getRoleWelcomeTemplate } from "@/lib/adminMailTemplates";

type Role = "artist" | "gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const EMAIL_VERIFICATION_REQUIRED = true;

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("POST /api/auth/signup: DATABASE_URL is not set");
      return NextResponse.json(
        { ok: false, error: "server error", details: "DATABASE_URL is not set" },
        { status: 500 }
      );
    }
    const body = await req.json().catch(() => null);
    const role = String(body?.role ?? "") as Role;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();
    const artistId = String(body?.artistId ?? "").trim();
    const galleryId = String(body?.galleryId ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const startedYear = Number(body?.startedYear ?? 0);
    const genre = String(body?.genre ?? "").trim();
    const instagram = String(body?.instagram ?? "").trim();
    const portfolioUrl = String(body?.portfolioUrl ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const foundedYear = Number(body?.foundedYear ?? 0);
    const lang = detectEmailLang(req.headers.get("accept-language"));

    if (role !== "artist" && role !== "gallery") {
      return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "password min 6 chars" },
        { status: 400 }
      );
    }
    if (role === "artist") {
      if (!artistId || !name || !startedYear || !genre) {
        return NextResponse.json(
          { ok: false, error: "missing artist fields" },
          { status: 400 }
        );
      }
    }
    if (role === "gallery") {
      if (!galleryId || !name || !address || !foundedYear || !instagram) {
        return NextResponse.json(
          { ok: false, error: "missing gallery fields" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) throw new Error("user exists");

      const created = await tx.user.create({
        data: {
          email,
          role,
          passwordHash: bcrypt.hashSync(password, 10),
        },
      });

      if (role === "artist") {
        await tx.artistProfile.create({
          data: {
            userId: created.id,
            artistId,
            name,
            startedYear,
            genre,
            instagram: instagram || undefined,
            portfolioUrl: portfolioUrl || undefined,
          },
        });
      } else {
        await tx.galleryProfile.create({
          data: {
            userId: created.id,
            galleryId,
            name,
            address,
            foundedYear,
            instagram: instagram || undefined,
          },
        });
      }

    });

    // Send verification email (signup requires email verification before login)
    const { token } = await createOrRefreshVerificationToken({ email, role });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";
    const verifyUrl = `${appUrl}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`;
    const sent = await sendVerificationEmail({
      to: email,
      role,
      verifyUrl,
      lang,
    });

    let welcomeSent = false;
    let welcomeError: string | null = null;
    try {
      const welcomeTemplate = await getRoleWelcomeTemplate(role);
      const welcomeText = `${welcomeTemplate.message}\n\n---\nSent from ROB`;
      const welcomeHtml = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">
          <div style="white-space:pre-wrap;line-height:1.6">${welcomeTemplate.message}</div>
          <hr style="margin:20px 0;border:none;border-top:1px solid #eee"/>
          <div style="font-size:12px;color:#666">Sent from ROB</div>
        </div>
      `;
      const welcome = await sendPlatformEmail({
        emailType: role === "artist" ? "welcome_artist" : "welcome_gallery",
        to: email,
        subject: welcomeTemplate.subject,
        text: welcomeText,
        html: welcomeHtml,
        meta: { role, source: "signup", lang },
      });
      welcomeSent = !!welcome.ok;
      if (!welcome.ok) welcomeError = welcome.error || "welcome email send failed";
    } catch (e: any) {
      welcomeError = String(e?.message || "welcome email send failed");
      console.error("Welcome email send failed:", e);
    }

    if (!sent.ok) {
      console.error("Verification email send failed:", sent.error || "unknown error");
      return NextResponse.json(
        {
          ok: true,
          requiresEmailVerification: true,
          verificationEmailSent: false,
          welcomeEmailSent: welcomeSent,
          email,
          error: "verification email send failed",
          details: sent.error || "failed to send verification email",
          welcomeError,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        requiresEmailVerification: true,
        verificationEmailSent: true,
        welcomeEmailSent: welcomeSent,
        welcomeError,
        email,
      },
      { status: 200 }
    );
  } catch (e: any) {
    if (String(e?.message).includes("user exists")) {
      return NextResponse.json({ ok: false, error: "user exists" }, { status: 409 });
    }
    console.error("POST /api/auth/signup failed:", e);
    const details = e instanceof Error ? e.message : String(e) || "unknown error";
    return NextResponse.json(
      { ok: false, error: "server error", details },
      { status: 500 }
    );
  }
}
