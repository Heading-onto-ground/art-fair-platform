// Gallery outreach email templates and send logic
// Sends automated invitation emails to external galleries

import type { OutreachRecord as OutreachRecordModel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createOutreachUnsubscribeToken } from "@/lib/outreachUnsubscribe";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rob-roleofbridge.com";

export type OutreachEmail = {
  to: string;
  galleryName: string;
  country: string;
  language: "en" | "ko" | "ja" | "fr" | "de" | "it" | "zh";
};

export type OutreachRecord = OutreachRecordModel;

export async function listOutreachRecords(): Promise<OutreachRecord[]> {
  return prisma.outreachRecord.findMany({
    orderBy: { sentAt: "desc" },
  });
}

export async function getOutreachStats() {
  const [total, sent, opened, clicked, signedUp, failed] = await Promise.all([
    prisma.outreachRecord.count(),
    prisma.outreachRecord.count({ where: { status: "sent" } }),
    prisma.outreachRecord.count({ where: { status: "opened" } }),
    prisma.outreachRecord.count({ where: { status: "clicked" } }),
    prisma.outreachRecord.count({ where: { status: "signed_up" } }),
    prisma.outreachRecord.count({ where: { status: "failed" } }),
  ]);

  return {
    total,
    sent,
    opened,
    clicked,
    signedUp,
    failed,
    conversionRate: total > 0 ? ((signedUp / total) * 100).toFixed(1) : "0.0",
  };
}

async function createOutreachRecord(
  input: Pick<OutreachRecord, "toEmail" | "galleryName" | "country" | "language" | "status">
): Promise<OutreachRecord> {
  return prisma.outreachRecord.create({
    data: input,
  });
}

// Localized email templates
const TEMPLATES: Record<string, { subject: string; body: string }> = {
  en: {
    subject: "NOAS n( )as × ROB — Korean Artist Portfolio Curation",
    body: `Hello, this is NOAS n( )as, a global art and culture community with chapters in Seoul, Busan, London, and Tokyo.

Our headquarters is based in Seoul, and we currently have a network of 200 Korean artists.

We are curating artists' portfolios on our platform, rob-roleofbridge.com.
At the moment, around 100 artists have joined the platform, though fewer have completed their portfolios.

We are looking to connect with galleries interested in exhibiting Korean artists.
If you could share your preferred themes, genres, or mediums, we would be delighted to send you a selection of relevant artist portfolios.

Platform:
{{signupUrl}}

Unsubscribe:
{{unsubscribeUrl}}

Thank you.`,
  },
  ko: {
    subject: "노아스 n( )as × ROB — 한국 작가 포트폴리오 큐레이션 제안",
    body: `안녕하세요 서울 부산 런던 도쿄 지부가 있는 글로벌 아트 컬쳐 커뮤니티 '노아스 n( )as' 입니다.
헤드 쿼터는 서울이고, 현재 200명의 한국 아티스트들이 모여 있습니다.

rob-roleofbridge.com 이라는 플랫폼에 아티스트들의 포트폴리오를 모으고 있습니다.
아직은 플랫폼에 가입한 작가들 숫자가 100명이고, 그 중 포트폴리오 작성 작가들은 더 적습니다.

한국 작가 전시를 원하는 갤러리들을 찾고 있습니다.
원하시는 주제, 장르, 매체 등을 말씀해주시면 관련된 작가들의 포트폴리오를 전달드리고 싶습니다.

플랫폼:
{{signupUrl}}

수신거부:
{{unsubscribeUrl}}

감사합니다.`,
  },
  ja: {
    subject: "ROBプラットフォームへのご招待 — 世界中のアーティストとつながりましょう",
    body: `{{galleryName}} 様

ROB（Role of Bridge）は、世界中のギャラリーとアーティストをつなぐグローバルアートプラットフォームです。

ROBがご提供するサービス：
• オープンコールを掲載し、世界中のアーティストからの応募を受け付け
• 厳選されたアーティストのポートフォリオを閲覧
• 応募管理、チャット、物流調整まで一括管理
• ギャラリーのご利用は完全無料

すでに10カ国以上のギャラリーがROBを活用しています。

今すぐ始める: {{signupUrl}}

ROBチーム`,
  },
  fr: {
    subject: "Invitation à ROB — Connectez votre galerie avec des artistes du monde entier",
    body: `Cher(e) {{galleryName}},

ROB (Role of Bridge) est une plateforme d'art mondiale connectant les galeries avec des artistes talentueux du monde entier.

Ce que ROB offre à votre galerie :
• Publiez des appels à candidatures et recevez des dossiers d'artistes internationaux
• Consultez des portfolios d'artistes vérifiés
• Gérez les candidatures, chattez avec les artistes et coordonnez la logistique
• Entièrement gratuit pour les galeries

Des galeries de plus de 10 pays utilisent déjà ROB.

Commencez maintenant : {{signupUrl}}

Cordialement,
L'équipe ROB`,
  },
  de: {
    subject: "Einladung zu ROB — Verbinden Sie Ihre Galerie mit Künstlern weltweit",
    body: `Liebe(r) {{galleryName}},

ROB (Role of Bridge) ist eine globale Kunstplattform, die Galerien mit talentierten Künstlern weltweit verbindet.

Was ROB Ihrer Galerie bietet:
• Veröffentlichen Sie Open Calls und erhalten Sie Bewerbungen internationaler Künstler
• Durchsuchen Sie verifizierte Künstlerportfolios
• Verwalten Sie Bewerbungen, chatten Sie mit Künstlern und koordinieren Sie die Logistik
• Völlig kostenlos für Galerien

Galerien aus über 10 Ländern nutzen bereits ROB.

Jetzt starten: {{signupUrl}}

Mit freundlichen Grüßen,
Das ROB-Team`,
  },
};

function getTemplate(lang: string): { subject: string; body: string } {
  return TEMPLATES[lang] || TEMPLATES["en"];
}

export async function sendOutreachEmail(data: OutreachEmail): Promise<{ ok: boolean; record?: OutreachRecord; error?: string }> {
  const template = getTemplate(data.language);
  const signupUrl = `${PLATFORM_URL}/login?role=gallery&ref=outreach`;
  const unsubscribeToken = createOutreachUnsubscribeToken(data.to);
  const unsubscribeUrl = unsubscribeToken ? `${PLATFORM_URL}/api/outreach/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}` : "";

  const subject = template.subject;
  const body = template.body
    .replace(/\{\{galleryName\}\}/g, data.galleryName)
    .replace(/\{\{signupUrl\}\}/g, signupUrl)
    .replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);

  if (!RESEND_API_KEY) {
    console.log("═══════════════════════════════════════════════");
    console.log("📧 OUTREACH EMAIL (No RESEND_API_KEY set)");
    console.log(`   TO: ${data.to}`);
    console.log(`   GALLERY: ${data.galleryName}`);
    console.log(`   LANG: ${data.language}`);
    console.log(`   SUBJECT: ${subject}`);
    console.log("═══════════════════════════════════════════════");

    const record = await createOutreachRecord({
      toEmail: data.to,
      galleryName: data.galleryName,
      country: data.country,
      language: data.language,
      status: "sent",
    });
    return { ok: true, record };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `ROB — Role of Bridge <${FROM_EMAIL}>`,
        to: [data.to],
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const record = await createOutreachRecord({
        toEmail: data.to,
        galleryName: data.galleryName,
        country: data.country,
        language: data.language,
        status: "failed",
      });
      return { ok: false, record, error: err?.message || "Send failed" };
    }

    const record = await createOutreachRecord({
      toEmail: data.to,
      galleryName: data.galleryName,
      country: data.country,
      language: data.language,
      status: "sent",
    });
    return { ok: true, record };
  } catch (error: any) {
    const record = await createOutreachRecord({
      toEmail: data.to,
      galleryName: data.galleryName,
      country: data.country,
      language: data.language,
      status: "failed",
    });
    return { ok: false, record, error: error?.message || "Failed" };
  }
}

// Batch send outreach to multiple galleries
export async function sendBatchOutreach(galleries: OutreachEmail[]): Promise<{ sent: number; failed: number; records: OutreachRecord[] }> {
  const results: OutreachRecord[] = [];
  let sent = 0;
  let failed = 0;

  for (const gallery of galleries) {
    const result = await sendOutreachEmail(gallery);
    if (result.record) results.push(result.record);
    if (result.ok) sent++;
    else failed++;
  }

  return { sent, failed, records: results };
}
