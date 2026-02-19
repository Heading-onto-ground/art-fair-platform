"use client";

import { useEffect, useState } from "react";
import TopBar from "@/app/components/TopBar";
import { CardSkeleton } from "@/app/components/Skeleton";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type AboutContent = {
  title: string;
  subtitle: string;
  story: string;
  mission: string;
  founderName: string;
  founderInstagram: string;
  founderImageUrl: string;
  updatedAt?: number;
};

export default function AboutPage() {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [content, setContent] = useState<AboutContent | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/about", { cache: "default" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.content) throw new Error(data?.error || "failed to load about");
        setContent(data.content as AboutContent);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submitContact() {
    if (
      !contactForm.name.trim() ||
      !contactForm.email.trim() ||
      !contactForm.subject.trim() ||
      !contactForm.message.trim()
    ) {
      setSendResult(
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
    setSendResult(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "send failed");
      }
      setSendResult(
        tr(
          "Your message was sent successfully.",
          "문의 메시지가 정상적으로 전송되었습니다.",
          "お問い合わせメッセージを送信しました。",
          "Votre message a ete envoye avec succes."
        )
      );
      setContactForm({ name: "", email: "", subject: "", message: "" });
    } catch (e: any) {
      setSendResult(
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
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 72px" }}>
        {loading ? (
          <CardSkeleton count={4} />
        ) : err ? (
          <div
            style={{
              border: "1px solid #E8E3DB",
              background: "#FFFFFF",
              padding: 20,
              color: "#8B3A3A",
              fontFamily: F,
              fontSize: 13,
            }}
          >
            {err}
          </div>
        ) : content ? (
          <>
            <section style={{ marginBottom: 32 }}>
              <div
                style={{
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#8B7355",
                  marginBottom: 12,
                }}
              >
                Platform
              </div>
              <h1 style={{ fontFamily: S, fontSize: "clamp(36px, 8vw, 54px)", fontWeight: 300, margin: 0 }}>
                {content.title}
              </h1>
              <p
                style={{
                  marginTop: 16,
                  color: "#6F6A64",
                  fontFamily: F,
                  fontSize: 14,
                  lineHeight: 1.8,
                  maxWidth: 760,
                }}
              >
                {content.subtitle}
              </p>
            </section>

            <section
              style={{
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                padding: "24px clamp(18px, 3vw, 34px)",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontFamily: S, fontSize: 28, fontWeight: 300, margin: "0 0 12px" }}>Our Story</h2>
              <p style={{ margin: 0, fontFamily: F, fontSize: 14, color: "#4A4A4A", lineHeight: 1.9 }}>
                {content.story}
              </p>
            </section>

            <section
              style={{
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                padding: "24px clamp(18px, 3vw, 34px)",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontFamily: S, fontSize: 28, fontWeight: 300, margin: "0 0 12px" }}>Mission</h2>
              <p style={{ margin: 0, fontFamily: F, fontSize: 14, color: "#4A4A4A", lineHeight: 1.9 }}>
                {content.mission}
              </p>
            </section>

            <section
              style={{
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                padding: "24px clamp(18px, 3vw, 34px)",
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 20,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  border: "1px solid #E8E3DB",
                  background: "#F7F3ED",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {content.founderImageUrl ? (
                  <img
                    src={content.founderImageUrl}
                    alt="Founder"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontFamily: F, fontSize: 10, color: "#A39B92", letterSpacing: "0.08em" }}>
                    FOUNDER
                  </span>
                )}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: F,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#8B7355",
                    marginBottom: 8,
                  }}
                >
                  Founder
                </div>
                <div style={{ fontFamily: S, fontSize: 30, fontWeight: 300, color: "#1A1A1A" }}>
                  {content.founderName}
                </div>
                <div style={{ marginTop: 6 }}>
                  <a
                    href={`https://instagram.com/${content.founderInstagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontFamily: F, fontSize: 13, color: "#8B7355", textDecoration: "underline" }}
                  >
                    {content.founderInstagram || "@noas_no_art_special"}
                  </a>
                </div>
              </div>
            </section>

            <section
              style={{
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                padding: "18px clamp(18px, 3vw, 34px)",
                marginTop: 20,
              }}
            >
              <div
                style={{
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#8A8580",
                  marginBottom: 8,
                }}
              >
                Contact
              </div>
              <a
                href="mailto:contact@rob-roleofbridge.com"
                style={{ fontFamily: F, fontSize: 14, color: "#8B7355", textDecoration: "underline" }}
              >
                contact@rob-roleofbridge.com
              </a>
            </section>

            <section
              style={{
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                padding: "20px clamp(18px, 3vw, 34px)",
                marginTop: 14,
              }}
            >
              <div
                style={{
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#8A8580",
                  marginBottom: 12,
                }}
              >
                {tr("Inquiry Form", "문의 폼", "お問い合わせフォーム", "Formulaire de contact")}
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input
                    value={contactForm.name}
                    onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder={tr("Your name", "이름", "お名前", "Votre nom")}
                    style={inp}
                  />
                  <input
                    value={contactForm.email}
                    onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder={tr("Your email", "이메일", "メールアドレス", "Votre email")}
                    style={inp}
                  />
                </div>
                <input
                  value={contactForm.subject}
                  onChange={(e) => setContactForm((p) => ({ ...p, subject: e.target.value }))}
                  placeholder={tr("Subject", "제목", "件名", "Sujet")}
                  style={inp}
                />
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder={tr("Message", "메시지", "メッセージ", "Message")}
                  style={{ ...inp, minHeight: 140, resize: "vertical" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={submitContact}
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
                  {sendResult ? (
                    <span style={{ fontFamily: F, fontSize: 12, color: "#6A6A6A" }}>{sendResult}</span>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        ) : null}
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

