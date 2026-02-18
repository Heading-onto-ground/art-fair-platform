"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

export default function AdminMailPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("custom");
  const [form, setForm] = useState({
    to: "",
    subject: "",
    message: "",
    replyTo: "contact@rob-roleofbridge.com",
  });
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;
  const templates = [
    {
      id: "custom",
      name: tr("Custom", "직접 작성", "カスタム", "Personnalise"),
      subject: "",
      message: "",
    },
    {
      id: "partnership",
      name: tr("Partnership Inquiry", "제휴 문의", "パートナーシップ問い合わせ", "Demande de partenariat"),
      subject: tr(
        "[ROB] Partnership Inquiry",
        "[ROB] 제휴 문의",
        "[ROB] パートナーシップのお問い合わせ",
        "[ROB] Demande de partenariat"
      ),
      message: tr(
        "Hello,\n\nThis is ROB (Role of Bridge), a global platform connecting artists and galleries.\nWe would love to explore a partnership opportunity with your team.\n\nIf you are interested, please reply and we can arrange a short call.\n\nBest regards,\nROB Team",
        "안녕하세요.\n\n저희는 전세계 아티스트와 갤러리를 연결하는 ROB(Role of Bridge)입니다.\n귀사와의 제휴 가능성을 논의하고 싶습니다.\n\n관심 있으시면 회신 부탁드리며, 짧은 미팅 일정을 조율하겠습니다.\n\n감사합니다.\nROB 팀",
        "こんにちは。\n\n私たちは世界中のアーティストとギャラリーをつなぐROB（Role of Bridge）です。\n御社とのパートナーシップの可能性についてご相談したくご連絡しました。\n\nご関心がございましたらご返信ください。短い打ち合わせ日程を調整いたします。\n\nよろしくお願いいたします。\nROBチーム",
        "Bonjour,\n\nNous sommes ROB (Role of Bridge), une plateforme mondiale qui connecte artistes et galeries.\nNous aimerions explorer une opportunite de partenariat avec votre equipe.\n\nSi cela vous interesse, repondez a cet email et nous organiserons un court echange.\n\nCordialement,\nEquipe ROB"
      ),
    },
    {
      id: "open_call",
      name: tr("Open Call Invitation", "오픈콜 초대", "オープンコール招待", "Invitation open call"),
      subject: tr(
        "[ROB] Invitation to Post an Open Call",
        "[ROB] 오픈콜 등록 초대",
        "[ROB] オープンコール掲載のご案内",
        "[ROB] Invitation a publier un open call"
      ),
      message: tr(
        "Hello,\n\nWe are reaching out from ROB to invite your gallery to post your open call on our platform.\nArtists from many countries use ROB to discover and apply to exhibitions.\n\nIf you would like, we can help you create your first listing.\n\nBest regards,\nROB Team",
        "안녕하세요.\n\nROB에서 갤러리의 오픈콜을 플랫폼에 등록해보시길 제안드립니다.\n다양한 국가의 작가들이 ROB를 통해 전시 기회를 찾고 지원하고 있습니다.\n\n원하시면 첫 등록을 저희가 도와드리겠습니다.\n\n감사합니다.\nROB 팀",
        "こんにちは。\n\nROBより、貴ギャラリーのオープンコール掲載をご案内します。\n多くの国のアーティストがROBで展示機会を探し、応募しています。\n\nご希望があれば初回掲載をサポートいたします。\n\nよろしくお願いいたします。\nROBチーム",
        "Bonjour,\n\nNous vous contactons depuis ROB pour inviter votre galerie a publier son open call sur notre plateforme.\nDes artistes de nombreux pays utilisent ROB pour trouver et candidater a des expositions.\n\nSi vous le souhaitez, nous pouvons vous aider a creer votre premiere annonce.\n\nCordialement,\nEquipe ROB"
      ),
    },
    {
      id: "artist_reply",
      name: tr("Reply to Applicant", "지원자 회신", "応募者への返信", "Reponse au candidat"),
      subject: tr(
        "[ROB] Thank You for Your Application",
        "[ROB] 지원해주셔서 감사합니다",
        "[ROB] ご応募ありがとうございます",
        "[ROB] Merci pour votre candidature"
      ),
      message: tr(
        "Hello,\n\nThank you for your interest and application.\nWe are reviewing submissions and will get back to you once the evaluation is complete.\n\nBest regards,\nROB Team",
        "안녕하세요.\n\n관심 가져주시고 지원해주셔서 감사합니다.\n현재 접수된 지원서를 검토 중이며, 심사가 완료되면 다시 안내드리겠습니다.\n\n감사합니다.\nROB 팀",
        "こんにちは。\n\nこの度はご関心とご応募をありがとうございます。\n現在応募内容を確認しており、審査完了後にご連絡いたします。\n\nよろしくお願いいたします。\nROBチーム",
        "Bonjour,\n\nMerci pour votre interet et votre candidature.\nNous examinons actuellement les dossiers et reviendrons vers vous apres evaluation.\n\nCordialement,\nEquipe ROB"
      ),
    },
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => null);
        if (!data?.authenticated) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  async function sendMail() {
    if (!form.to.trim() || !form.subject.trim() || !form.message.trim()) {
      setResult(tr("Please fill required fields.", "필수 항목을 입력해주세요.", "必須項目を入力してください。", "Veuillez remplir les champs obligatoires."));
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "send failed");
      setResult(tr("Email sent successfully.", "이메일 발송 완료.", "メールを送信しました。", "Email envoye avec succes."));
      setForm((p) => ({ ...p, subject: "", message: "" }));
    } catch (e: any) {
      setResult(e?.message || tr("Failed to send email.", "이메일 발송 실패.", "メール送信に失敗しました。", "Echec de l'envoi de l'email."));
    } finally {
      setSending(false);
    }
  }

  function applyTemplate(nextId: string) {
    setTemplateId(nextId);
    const selected = templates.find((t) => t.id === nextId);
    if (!selected || nextId === "custom") return;
    setForm((p) => ({ ...p, subject: selected.subject, message: selected.message }));
  }

  if (authenticated === null) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FDFBF7" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>
          {tr("Authenticating...", "인증 중...", "認証中...", "Authentification...")}
        </p>
      </main>
    );
  }
  if (!authenticated) return null;

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "56px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            {tr("Admin", "관리자", "管理者", "Admin")}
          </span>
          <h1 style={{ fontFamily: S, fontSize: 40, fontWeight: 300, marginTop: 8 }}>
            {tr("Send Email", "메일 보내기", "メール送信", "Envoyer un email")}
          </h1>
        </div>

        <div
          style={{
            border: "1px solid #E8E3DB",
            background: "#FAF8F4",
            padding: "14px 16px",
            marginBottom: 14,
            fontFamily: F,
            fontSize: 12,
            color: "#6F6A64",
            lineHeight: 1.6,
          }}
        >
          {tr(
            "Deliverability check: SPF is configured. DMARC appears missing in DNS. Add a TXT record for _dmarc.rob-roleofbridge.com to reduce spam-box risk.",
            "전달성 체크: SPF는 설정되어 있습니다. DNS에서 DMARC는 아직 보이지 않습니다. 스팸함 위험을 줄이려면 _dmarc.rob-roleofbridge.com TXT 레코드를 추가하세요.",
            "到達性チェック: SPF は設定済みです。DNS では DMARC が未設定に見えます。迷惑メール判定を減らすため、_dmarc.rob-roleofbridge.com の TXT レコードを追加してください。",
            "Verification de delivrabilite : SPF est configure. DMARC semble absent dans le DNS. Ajoutez un enregistrement TXT pour _dmarc.rob-roleofbridge.com afin de reduire le risque de spam."
          )}
        </div>

        <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: 24, display: "grid", gap: 12 }}>
          <label style={labelStyle}>
            {tr("Template", "템플릿", "テンプレート", "Modele")}
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)} style={inp}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            {tr("Recipient", "수신자", "宛先", "Destinataire")}
            <input value={form.to} onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))} placeholder="gallery@example.com" style={inp} />
          </label>

          <label style={labelStyle}>
            {tr("Reply-To", "회신 주소", "返信先", "Adresse de reponse")}
            <input value={form.replyTo} onChange={(e) => setForm((p) => ({ ...p, replyTo: e.target.value }))} placeholder="contact@rob-roleofbridge.com" style={inp} />
          </label>

          <label style={labelStyle}>
            {tr("Subject", "제목", "件名", "Sujet")}
            <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} style={inp} />
          </label>

          <label style={labelStyle}>
            {tr("Message", "메시지", "メッセージ", "Message")}
            <textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} style={{ ...inp, minHeight: 220, resize: "vertical" }} />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={sendMail}
              disabled={sending}
              style={{
                padding: "11px 20px",
                border: "1px solid #1A1A1A",
                background: "#1A1A1A",
                color: "#FFFFFF",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: sending ? "wait" : "pointer",
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending
                ? tr("Sending...", "전송 중...", "送信中...", "Envoi...")
                : tr("Send Email", "메일 발송", "メール送信", "Envoyer")}
            </button>

            {result ? <span style={{ fontFamily: F, fontSize: 12, color: "#6A6A6A" }}>{result}</span> : null}
          </div>
        </div>
      </main>
    </>
  );
}

const labelStyle = {
  display: "grid",
  gap: 6,
  fontFamily: F,
  fontSize: 11,
  color: "#8A8580",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

const inp = {
  width: "100%",
  border: "1px solid #E8E3DB",
  background: "#FFFFFF",
  color: "#1A1A1A",
  padding: "10px 12px",
  fontFamily: F,
  fontSize: 13,
  lineHeight: 1.6,
  outline: "none",
  textTransform: "none",
  letterSpacing: "normal",
} as const;

