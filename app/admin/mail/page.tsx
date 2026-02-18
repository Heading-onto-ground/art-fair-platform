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
  const [form, setForm] = useState({
    to: "",
    subject: "",
    message: "",
    replyTo: "contact@rob-roleofbridge.com",
  });
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

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

        <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: 24, display: "grid", gap: 12 }}>
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

