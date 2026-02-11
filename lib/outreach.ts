// Gallery outreach email templates and send logic
// Sends automated invitation emails to external galleries

import type { OutreachRecord as OutreachRecordModel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

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
    subject: "Invitation to ROB — Reach Global Artists for Your Gallery",
    body: `Dear {{galleryName}},

We are writing to introduce ROB (Role of Bridge), a global art platform connecting galleries with talented artists worldwide.

What ROB offers your gallery:
• Publish open calls and receive applications from international artists
• Browse curated artist portfolios with verified credentials
• Manage applications, chat with artists, and coordinate logistics — all in one place
• Completely free for galleries

Galleries from 10+ countries already use ROB to discover emerging talent. Your gallery would be a wonderful addition to our network.

Get started in 2 minutes: {{signupUrl}}

We'd love to have you on board.

Best regards,
The ROB Team
Role of Bridge — Global Art Network`,
  },
  ko: {
    subject: "ROB 플랫폼 초대 — 전 세계 아티스트와 갤러리를 연결합니다",
    body: `{{galleryName}} 관계자님께,

안녕하세요, 글로벌 아트 플랫폼 ROB(Role of Bridge)입니다.

ROB는 전 세계 갤러리와 아티스트를 연결하는 플랫폼으로, 갤러리에 다음과 같은 기능을 제공합니다:

• 오픈콜 게시 후 국제 아티스트의 지원서를 받으세요
• 검증된 아티스트 포트폴리오를 직접 열람하세요
• 지원 관리, 아티스트 채팅, 물류 조율까지 한 곳에서 처리하세요
• 갤러리 이용은 완전 무료입니다

이미 10개국 이상의 갤러리가 ROB를 통해 신진 작가를 발굴하고 있습니다.

지금 바로 시작하세요: {{signupUrl}}

감사합니다.
ROB 팀 드림`,
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
  const signupUrl = `https://rob-platform.vercel.app/login?role=gallery&ref=outreach`;

  const subject = template.subject;
  const body = template.body
    .replace(/\{\{galleryName\}\}/g, data.galleryName)
    .replace(/\{\{signupUrl\}\}/g, signupUrl);

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
