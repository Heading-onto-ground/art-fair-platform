// Email sending utility using Resend
// Set RESEND_API_KEY in .env.local to enable email sending
import { logEmailEvent } from "@/lib/emailLog";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const PLATFORM_NAME = "ROB — Role of Bridge";
const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";

export type ArtistApplicationEmail = {
  galleryEmail: string;
  galleryName: string;
  openCallTheme: string;
  artistName: string;
  artistEmail: string;
  artistCountry: string;
  artistCity: string;
  artistBio?: string;
  portfolioUrl?: string;
  artistWebsite?: string;
  message?: string;
};

export type WelcomeEmailInput = {
  to: string;
  role: "artist" | "gallery" | "curator";
  name?: string;
  lang?: "en" | "ko" | "ja" | "fr";
};

export type VerificationEmailInput = {
  to: string;
  role: "artist" | "gallery" | "curator";
  verifyUrl: string;
  lang?: "en" | "ko" | "ja" | "fr";
};

export function detectEmailLang(lang?: string | null): "en" | "ko" | "ja" | "fr" {
  const v = String(lang || "").toLowerCase();
  if (v.startsWith("ko")) return "ko";
  if (v.startsWith("ja")) return "ja";
  if (v.startsWith("fr")) return "fr";
  return "en";
}

function normalizeLang(lang?: string | null): "en" | "ko" | "ja" | "fr" {
  return detectEmailLang(lang);
}

function buildWelcomeSubject(role: "artist" | "gallery" | "curator", lang: "en" | "ko" | "ja" | "fr"): string {
  return "Thank you for joining ROB — A message from the CEO";
}

function buildWelcomeText(input: WelcomeEmailInput, lang: "en" | "ko" | "ja" | "fr"): string {
  return `
Hello,

This is the CEO of ROB; role of bridge, a global art open call and artist community platform.

Thank you sincerely for joining and being part of this platform in its early stages. We truly hope ROB can support and accompany you in your artistic journey.

Your feedback is always welcome. As the official platform email is still being set up, I am reaching out through my personal email to express my gratitude. Please feel free to share any thoughts, suggestions, or hopes you may have for the platform.

Thank you once again.

Warm regards,
CEO
ROB; role of bridge


안녕하세요, 글로벌 아트 공모전 + 아티스트 커뮤니티 플랫폼 ROB; role of bridge 의 CEO 입니다.
이제 막 시작된 이 플랫폼에 참여해주셔서 정말 감사합니다.
아티스트 분들의 작업 여정에 도움이 되고 싶습니다.
피드백은 언제나 환영입니다.
아직은 이 플랫폼의 공식 이메일이 만들어지기 전이라서,
개인 이메일로 감사 인사 드립니다. 플랫폼 에 바라는 점 편하게 메일 주세요.

다시 한 번 감사드립니다!
`.trim();
}

function buildWelcomeHtml(input: WelcomeEmailInput, lang: "en" | "ko" | "ja" | "fr"): string {
  const plain = buildWelcomeText(input, lang).replace(/\n/g, "<br/>");
  return `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#ffffff;color:#111111;">
  <h2 style="margin:0 0 12px 0;">ROB — Role of Bridge</h2>
  <div style="font-size:14px;line-height:1.7;">${plain}</div>
</div>`;
}

function buildVerificationSubject(lang: "en" | "ko" | "ja" | "fr"): string {
  if (lang === "ko") return "ROB 이메일 인증을 완료해주세요";
  if (lang === "ja") return "ROB メール認証を完了してください";
  if (lang === "fr") return "Veuillez verifier votre email ROB";
  return "Verify your email for ROB";
}

function buildVerificationText(input: VerificationEmailInput, lang: "en" | "ko" | "ja" | "fr"): string {
  if (lang === "ko") {
    return `안녕하세요,\n\nROB 계정 생성을 완료하려면 아래 링크를 눌러 이메일 인증을 진행해주세요.\n\n${input.verifyUrl}\n\n본인이 가입하지 않았다면 이 메일을 무시하셔도 됩니다.\n\nROB 팀`;
  }
  if (lang === "ja") {
    return `こんにちは。\n\nROBアカウントの作成を完了するには、以下のリンクからメール認証を行ってください。\n\n${input.verifyUrl}\n\n心当たりがない場合は、このメールを無視してください。\n\nROB Team`;
  }
  if (lang === "fr") {
    return `Bonjour,\n\nPour finaliser la creation de votre compte ROB, veuillez verifier votre email via le lien ci-dessous.\n\n${input.verifyUrl}\n\nSi vous n'etes pas a l'origine de cette demande, ignorez cet email.\n\nL'equipe ROB`;
  }
  return `Hi,\n\nTo finish creating your ROB account, please verify your email using the link below.\n\n${input.verifyUrl}\n\nIf you did not create this account, you can ignore this message.\n\nThe ROB Team`;
}

function buildVerificationHtml(input: VerificationEmailInput, lang: "en" | "ko" | "ja" | "fr"): string {
  const text = buildVerificationText(input, lang).replace(/\n/g, "<br/>");
  return `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#ffffff;color:#111111;">
  <h2 style="margin:0 0 12px 0;">ROB — Role of Bridge</h2>
  <div style="font-size:14px;line-height:1.7;margin-bottom:16px;">${text}</div>
  <a href="${input.verifyUrl}" style="display:inline-block;padding:10px 16px;background:#1A1A1A;color:#fff;text-decoration:none;border-radius:4px;">Verify Email</a>
</div>`;
}

function buildApplicationEmailHtml(data: ArtistApplicationEmail): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #000000; color: #FFFFFF; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
    .header { border-bottom: 1px solid #333; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #FFFFFF; }
    .subtitle { font-size: 10px; letter-spacing: 0.15em; color: #666; text-transform: uppercase; margin-top: 4px; }
    .badge { display: inline-block; background: #00FF66; color: #000; font-size: 11px; font-weight: 700; padding: 4px 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 8px; }
    h2 { font-size: 14px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin: 24px 0 12px; }
    .info-row { padding: 8px 0; border-bottom: 1px solid #222; display: flex; }
    .info-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; min-width: 120px; }
    .info-value { color: #FFFFFF; font-size: 14px; }
    .message-box { background: #111; border: 1px solid #333; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.6; color: #CCC; }
    .cta { display: inline-block; background: #FFFFFF; color: #000; padding: 14px 32px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; margin-top: 16px; }
    .cta-secondary { display: inline-block; border: 1px solid #555; color: #FFFFFF; padding: 12px 24px; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; margin-top: 8px; margin-left: 8px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #222; font-size: 11px; color: #555; line-height: 1.6; }
    .green { color: #00FF66; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ROB</div>
      <div class="subtitle">ROLE OF BRIDGE — GLOBAL ART NETWORK</div>
    </div>
    
    <div class="badge">NEW APPLICATION</div>
    
    <h1>New Artist Application Received</h1>
    <p style="color: #888; font-size: 14px; margin-bottom: 32px;">
      An artist has applied to your open call <span class="green">"${data.openCallTheme}"</span> through the ROB platform.
    </p>
    
    <h2>ARTIST INFORMATION</h2>
    <table style="width:100%; border-collapse:collapse;">
      <tr style="border-bottom:1px solid #222;">
        <td style="padding:10px 0; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.1em; width:120px;">Name</td>
        <td style="padding:10px 0; color:#FFF; font-size:14px; font-weight:600;">${data.artistName}</td>
      </tr>
      <tr style="border-bottom:1px solid #222;">
        <td style="padding:10px 0; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.1em;">Email</td>
        <td style="padding:10px 0; color:#FFF; font-size:14px;"><a href="mailto:${data.artistEmail}" style="color:#00FF66; text-decoration:none;">${data.artistEmail}</a></td>
      </tr>
      <tr style="border-bottom:1px solid #222;">
        <td style="padding:10px 0; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.1em;">Location</td>
        <td style="padding:10px 0; color:#FFF; font-size:14px;">${data.artistCity}${data.artistCity && data.artistCountry ? ', ' : ''}${data.artistCountry}</td>
      </tr>
      ${data.artistWebsite ? `
      <tr style="border-bottom:1px solid #222;">
        <td style="padding:10px 0; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.1em;">Website</td>
        <td style="padding:10px 0;"><a href="${data.artistWebsite}" style="color:#00FF66; text-decoration:none;">${data.artistWebsite}</a></td>
      </tr>` : ''}
    </table>

    ${data.artistBio ? `
    <h2>ARTIST BIO</h2>
    <div class="message-box">${data.artistBio}</div>
    ` : ''}

    ${data.message ? `
    <h2>APPLICATION MESSAGE</h2>
    <div class="message-box">${data.message}</div>
    ` : ''}

    <div style="margin-top: 32px;">
      ${data.portfolioUrl ? `<a href="${data.portfolioUrl}" class="cta">VIEW PORTFOLIO →</a>` : ''}
      <a href="mailto:${data.artistEmail}" class="cta-secondary">REPLY TO ARTIST</a>
    </div>

    <div class="footer">
      <p>This application was submitted through <strong>ROB — Role of Bridge</strong>, a global art network platform connecting artists and galleries worldwide.</p>
      <p style="color:#444;">If you did not expect this email, you can safely ignore it. The artist applied to your open call that was listed on our platform.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildApplicationEmailText(data: ArtistApplicationEmail): string {
  return `
NEW APPLICATION — ROB (Role of Bridge)
═══════════════════════════════════════

An artist has applied to your open call "${data.openCallTheme}".

ARTIST INFORMATION
──────────────────
Name: ${data.artistName}
Email: ${data.artistEmail}
Location: ${data.artistCity}${data.artistCity && data.artistCountry ? ', ' : ''}${data.artistCountry}
${data.artistWebsite ? `Website: ${data.artistWebsite}` : ''}

${data.artistBio ? `BIO\n────\n${data.artistBio}\n` : ''}
${data.message ? `APPLICATION MESSAGE\n────────────────────\n${data.message}\n` : ''}
${data.portfolioUrl ? `PORTFOLIO: ${data.portfolioUrl}` : ''}

──────────────────
Sent via ROB — Role of Bridge (Global Art Network)
  `.trim();
}

export async function sendApplicationEmail(data: ArtistApplicationEmail): Promise<{ ok: boolean; error?: string }> {
  return sendPlatformEmail({
    emailType: "application_notification",
    to: data.galleryEmail,
    subject: `[ROB] New Application: ${data.artistName} → "${data.openCallTheme}"`,
    html: buildApplicationEmailHtml(data),
    text: buildApplicationEmailText(data),
    replyTo: data.artistEmail,
    meta: {
      galleryName: data.galleryName,
      openCallTheme: data.openCallTheme,
      artistName: data.artistName,
      artistEmail: data.artistEmail,
    },
  });
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<{ ok: boolean; error?: string }> {
  const lang = normalizeLang(input.lang);
  const subject = buildWelcomeSubject(input.role, lang);
  const text = buildWelcomeText(input, lang);
  const html = buildWelcomeHtml(input, lang);
  return sendPlatformEmail({
    emailType: "welcome",
    to: input.to,
    subject,
    html,
    text,
    meta: {
      role: input.role,
      lang,
      name: input.name || "",
    },
  });
}

export async function sendVerificationEmail(input: VerificationEmailInput): Promise<{ ok: boolean; error?: string }> {
  const lang = normalizeLang(input.lang);
  const subject = buildVerificationSubject(lang);
  const text = buildVerificationText(input, lang);
  const html = buildVerificationHtml(input, lang);
  return sendPlatformEmail({
    emailType: "verification",
    to: input.to,
    subject,
    html,
    text,
    meta: {
      role: input.role,
      lang,
      verifyUrl: input.verifyUrl,
    },
  });
}

function escapeHtmlForEmail(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ArtistVerificationRejectedEmailInput = {
  to: string;
  artistName: string;
  reviewNote?: string | null;
};

export async function sendArtistVerificationRejectedEmail(
  input: ArtistVerificationRejectedEmailInput,
): Promise<{ ok: boolean; error?: string }> {
  const to = input.to.trim();
  if (!to) return { ok: false, error: "missing to" };

  const name = (input.artistName || "").trim();
  const note = (input.reviewNote || "").trim();

  const textEnLines = [
    `Hi${name ? ` ${name}` : ""},`,
    ``,
    `Your artist verification request on ROB (Role of Bridge) was not approved at this time.`,
  ];
  if (note) {
    textEnLines.push(``, `Message from our team:`, note);
  }
  textEnLines.push(
    ``,
    `You may update your profile and submit a new verification request anytime from:`,
    `${PLATFORM_URL}/artist/me`,
    ``,
    `— ROB`,
  );

  const textKoLines = [
    `${name ? `${name}님` : "안녕하세요"},`,
    ``,
    `요청해 주신 ROB(Role of Bridge) 작가 검증은 이번에 승인되지 않았습니다.`,
  ];
  if (note) {
    textKoLines.push(``, `[운영 안내]`, note);
  }
  textKoLines.push(
    ``,
    `프로필을 보완한 뒤 작가 페이지에서 언제든지 다시 요청할 수 있습니다:`,
    `${PLATFORM_URL}/artist/me`,
    ``,
    `— ROB`,
  );

  const textBody = [...textEnLines, ``, `---`, ``, ...textKoLines].join("\n");

  const noteBlock = note
    ? `<div style="margin:16px 0;padding:12px 14px;background:#FAF8F4;border:1px solid #E8E3DB;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtmlForEmail(note)}</div>`
    : `<p style="color:#6A6660;font-size:13px;font-style:italic;margin:16px 0;">No additional message was included.</p>`;

  const htmlBody = `
<div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#ffffff;color:#111111;">
  <h2 style="margin:0 0 12px 0;font-size:18px;">ROB — Role of Bridge</h2>
  <p style="font-size:14px;line-height:1.7;margin:0 0 6px;"><strong>English.</strong> Your artist verification request was not approved at this time.</p>
  <p style="font-size:14px;line-height:1.7;margin:0 0 14px;"><strong>한국어.</strong> 작가 검증 요청이 이번에는 승인되지 않았습니다.</p>
  ${noteBlock}
  <p style="font-size:14px;line-height:1.7;margin-top:18px;"><a href="${PLATFORM_URL}/artist/me" style="color:#1A1A1A;text-decoration:underline;">${PLATFORM_URL}/artist/me</a></p>
</div>`;

  return sendPlatformEmail({
    emailType: "artist_verification_rejected",
    to,
    subject: `[ROB] Artist verification update · 작가 검증 안내`,
    html: htmlBody,
    text: textBody,
    meta: { artistName: name, hasNote: !!note },
  });
}

export type EmailAttachment = {
  filename: string;
  content: string; // base64-encoded
};

export type PlatformEmailInput = {
  emailType?: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  meta?: Record<string, unknown>;
};

export async function sendPlatformEmail(input: PlatformEmailInput): Promise<{ ok: boolean; error?: string }> {
  const emailType = String(input.emailType || "generic").trim() || "generic";
  const to = String(input.to || "").trim();
  const subject = String(input.subject || "").trim();
  const text = String(input.text || "").trim();
  const html = String(input.html || "").trim() || undefined;
  const replyTo = String(input.replyTo || "").trim() || undefined;
  const attachments = Array.isArray(input.attachments) && input.attachments.length > 0 ? input.attachments : undefined;
  const meta = input.meta || {};

  if (!to || !subject || !text) {
    await logEmailEvent({
      emailType,
      toEmail: to || "-",
      subject: subject || "-",
      status: "failed",
      error: "missing email fields",
      meta,
    });
    return { ok: false, error: "missing email fields" };
  }

  if (!RESEND_API_KEY) {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      await logEmailEvent({
        emailType,
        toEmail: to,
        subject,
        status: "failed",
        error: "RESEND_API_KEY is not configured",
        meta,
      });
      return { ok: false, error: "RESEND_API_KEY is not configured" };
    }
    console.log("═══════════════════════════════════════════════");
    console.log("📧 PLATFORM EMAIL (No RESEND_API_KEY set)");
    console.log(`   TO: ${to}`);
    console.log(`   SUBJECT: ${subject}`);
    if (replyTo) console.log(`   REPLY-TO: ${replyTo}`);
    console.log("═══════════════════════════════════════════════");
    await logEmailEvent({
      emailType,
      toEmail: to,
      subject,
      status: "simulated",
      meta,
    });
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${PLATFORM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        text,
        html: html || undefined,
        reply_to: replyTo,
        attachments: attachments || undefined,
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = result?.message || "Failed to send email";
      await logEmailEvent({
        emailType,
        toEmail: to,
        subject,
        status: "failed",
        error,
        meta: { ...meta, providerResponse: result },
      });
      return { ok: false, error };
    }
    await logEmailEvent({
      emailType,
      toEmail: to,
      subject,
      status: "sent",
      meta: { ...meta, providerId: result?.id || null },
    });
    return { ok: true };
  } catch (e: any) {
    const error = e?.message || "Email send failed";
    await logEmailEvent({
      emailType,
      toEmail: to,
      subject,
      status: "failed",
      error,
      meta,
    });
    return { ok: false, error };
  }
}
