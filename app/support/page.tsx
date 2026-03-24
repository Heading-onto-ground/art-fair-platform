"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";

type Msg = { id: string; fromAdmin: boolean; text: string; createdAt: string };

export default function SupportPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/support/messages", { credentials: "include", cache: "no-store" });
      if (res.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent("/support")}`);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load");
        return;
      }
      setMessages(data.messages || []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to send");
        return;
      }
      setText("");
      setMessages((prev) => [...prev, data.message]);
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            ROB
          </span>
          <h1 style={{ fontFamily: S, fontSize: 32, fontWeight: 300, color: "#1A1A1A", margin: "8px 0 0" }}>
            {lang === "ko" ? "관리자에게 쪽지" : lang === "ja" ? "管理者へメッセージ" : "Message to admin"}
          </h1>
          <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", marginTop: 10, lineHeight: 1.6 }}>
            {lang === "ko"
              ? "가입 계정으로 로그인한 상태에서만 사용할 수 있습니다. 이메일이 아닌 플랫폼 안에서 관리자와 주고받을 수 있습니다."
              : lang === "ja"
                ? "ログイン中のアカウントでのみ利用できます。メールではなくプラットフォーム内で管理者とやり取りできます。"
                : "Available while signed in. Exchange with the team inside the platform — not by email."}
          </p>
        </div>

        <div
          style={{
            border: "1px solid #E8E3DB",
            background: "#FFFFFF",
            minHeight: 280,
            padding: 20,
            marginBottom: 16,
          }}
        >
          {loading ? (
            <p style={{ fontFamily: F, color: "#B0AAA2" }}>{t("loading", lang)}</p>
          ) : messages.length === 0 ? (
            <p style={{ fontFamily: F, color: "#8A8580", fontSize: 13 }}>
              {lang === "ko"
                ? "아직 쪽지가 없습니다. 아래에 내용을 적고 보내 주세요."
                : lang === "ja"
                  ? "まだメッセージがありません。下に入力して送信してください。"
                  : "No messages yet. Type below to start."}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: 14,
                    border: "1px solid #F0EBE3",
                    background: m.fromAdmin ? "#FAF8F4" : "#FFFFFF",
                    borderRadius: 2,
                  }}
                >
                  <div style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: m.fromAdmin ? "#8B7355" : "#1A1A1A" }}>
                    {m.fromAdmin
                      ? lang === "ko"
                        ? "ROB 관리자"
                        : lang === "ja"
                          ? "ROB 管理者"
                          : "ROB Admin"
                      : lang === "ko"
                        ? "나"
                        : lang === "ja"
                          ? "自分"
                          : "You"}
                  </div>
                  <div style={{ marginTop: 8, fontFamily: F, fontSize: 14, color: "#1A1A1A", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{m.text}</div>
                  <div style={{ marginTop: 8, fontFamily: F, fontSize: 10, color: "#C4BDB0" }}>
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {error && (
          <p style={{ fontFamily: F, fontSize: 12, color: "#8B4A4A", marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              lang === "ko" ? "내용을 입력하세요…" : lang === "ja" ? "内容を入力…" : "Write your message…"
            }
            rows={4}
            style={{
              flex: 1,
              padding: "14px 16px",
              border: "1px solid #E8E3DB",
              background: "#FDFBF7",
              fontFamily: F,
              fontSize: 14,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            style={{
              padding: "14px 22px",
              border: "1px solid #1A1A1A",
              background: sending || !text.trim() ? "#E8E3DB" : "#1A1A1A",
              color: sending || !text.trim() ? "#8A8580" : "#FDFBF7",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: sending || !text.trim() ? "not-allowed" : "pointer",
              alignSelf: "stretch",
            }}
          >
            {sending ? "…" : lang === "ko" ? "보내기" : lang === "ja" ? "送信" : "Send"}
          </button>
        </div>
        <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", marginTop: 10 }}>
          {lang === "ko" ? "Ctrl+Enter / ⌘+Enter 로 빠르게 보낼 수 있습니다." : "Ctrl+Enter / ⌘+Enter to send quickly."}
        </p>
      </main>
    </>
  );
}
