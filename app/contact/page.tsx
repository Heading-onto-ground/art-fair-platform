"use client";

import { useState } from "react";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

export default function ContactPage() {
  const { lang } = useLanguage();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

  async function submit() {
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setResult(
        tr(
          "Please fill in all fields.",
          "모든 항목을 입력해주세요.",
          "すべての項目を入力してください。",
          "Veuillez remplir tous les champs."
        )
      );
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "send failed");
      setResult(
        tr(
          "Your message was sent successfully.",
          "문의 메시지가 전송되었습니다.",
          "お問い合わせメッセージを送信しました。",
          "Votre message a ete envoye avec succes."
        )
      );
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (e: any) {
      setResult(
        e?.message ||
          tr(
            "Failed to send message.",
            "메시지 전송에 실패했습니다.",
            "メッセージ送信に失敗しました。",
            "Echec de l'envoi du message."
          )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px 72px" }}>
        <div style={{ marginBottom: 22 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8B7355",
            }}
          >
            {tr("Support", "고객지원", "サポート", "Support")}
          </span>
          <h1 style={{ fontFamily: S, fontSize: "clamp(34px, 6vw, 48px)", fontWeight: 300, marginTop: 8 }}>
            {tr("1:1 Inquiry", "1:1 문의", "1:1 お問い合わせ", "Contact 1:1")}
          </h1>
          <p style={{ marginTop: 10, fontFamily: F, fontSize: 13, color: "#8A8580", lineHeight: 1.7 }}>
            {tr(
              "Send us your questions, feedback, or requests. We will reply by email.",
              "문의/피드백/요청사항을 보내주세요. 이메일로 답변드리겠습니다.",
              "ご質問・フィードバック・ご要望をお送りください。メールで返信いたします。",
              "Envoyez vos questions, retours ou demandes. Nous vous repondrons par email."
            )}
          </p>
        </div>

        <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: "20px clamp(18px, 3vw, 28px)", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={tr("Your name", "이름", "お名前", "Votre nom")}
              style={inp}
            />
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder={tr("Your email", "이메일", "メールアドレス", "Votre email")}
              style={inp}
            />
          </div>
          <input
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            placeholder={tr("Subject", "제목", "件名", "Sujet")}
            style={inp}
          />
          <textarea
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            placeholder={tr("Message", "메시지", "メッセージ", "Message")}
            style={{ ...inp, minHeight: 180, resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <button
              onClick={submit}
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
                : tr("Send Inquiry", "문의 보내기", "問い合わせ送信", "Envoyer")}
            </button>
            {result ? <span style={{ fontFamily: F, fontSize: 12, color: "#6A6A6A" }}>{result}</span> : null}
          </div>
        </div>
      </main>
    </>
  );
}

const inp = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #E8E3DB",
  background: "#FFFFFF",
  color: "#1A1A1A",
  fontFamily: F,
  fontSize: 13,
  outline: "none",
} as const;

