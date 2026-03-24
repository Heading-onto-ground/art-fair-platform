"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type ThreadRow = {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  updatedAt: string;
  lastMessage: { text: string; fromAdmin: boolean; createdAt: string } | null;
};

type Msg = { id: string; fromAdmin: boolean; text: string; createdAt: string };

export default function AdminSupportPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (en: string, ko: string) => (lang === "ko" ? ko : en);

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [needingReply, setNeedingReply] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/support/threads", { credentials: "include", cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed");
        return;
      }
      setThreads(data.threads || []);
      setNeedingReply(data.threadsNeedingReply ?? 0);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  async function openThread(id: string) {
    setSelectedId(id);
    setMsgLoading(true);
    setMessages([]);
    setReply("");
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/${id}/messages`, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed");
        return;
      }
      setUserEmail(data.thread?.userEmail || "");
      setUserRole(data.thread?.userRole || "");
      setMessages(data.messages || []);
    } catch {
      setError("Network error");
    } finally {
      setMsgLoading(false);
    }
  }

  async function sendReply() {
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: reply.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed");
        return;
      }
      setReply("");
      setMessages((prev) => [...prev, data.message]);
      loadThreads();
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>
        <h1 style={{ fontFamily: S, fontSize: 28, fontWeight: 400, color: "#1A1A1A", margin: "0 0 8px" }}>
          {tr("User messages", "가입자 쪽지")}
        </h1>
        <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", marginBottom: 24 }}>
          {tr(
            "Replies appear in the user’s account under Support — not by email.",
            "답변은 이메일이 아니라 사용자 계정의 「관리자 쪽지」에 표시됩니다.",
          )}
        </p>

        {needingReply > 0 && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              background: "rgba(139,115,85,0.08)",
              border: "1px solid rgba(139,115,85,0.25)",
              fontFamily: F,
              fontSize: 12,
              color: "#6B5A45",
            }}
          >
            {tr(`${needingReply} thread(s) need a reply`, `답변 대기 ${needingReply}건`)}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 24, alignItems: "start" }}>
          <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF" }}>
            {loading ? (
              <p style={{ padding: 20, fontFamily: F, color: "#B0AAA2" }}>…</p>
            ) : threads.length === 0 ? (
              <p style={{ padding: 20, fontFamily: F, color: "#8A8580", fontSize: 13 }}>
                {tr("No conversations yet.", "아직 쪽지가 없습니다.")}
              </p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {threads.map((t) => {
                  const needs = t.lastMessage && !t.lastMessage.fromAdmin;
                  const active = selectedId === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openThread(t.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px 14px",
                          border: "none",
                          borderBottom: "1px solid #F0EBE3",
                          background: active ? "#FAF8F4" : "#FFFFFF",
                          cursor: "pointer",
                          fontFamily: F,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", display: "flex", alignItems: "center", gap: 8 }}>
                          {needs && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#C45C4A",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {t.userEmail}
                        </div>
                        <div style={{ fontSize: 10, color: "#8A8580", marginTop: 4 }}>{t.userRole}</div>
                        {t.lastMessage && (
                          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.lastMessage.text}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", minHeight: 400, padding: 20 }}>
            {!selectedId ? (
              <p style={{ fontFamily: F, color: "#B0AAA2", fontSize: 13 }}>
                {tr("Select a conversation on the left.", "왼쪽에서 대화를 선택하세요.")}
              </p>
            ) : msgLoading ? (
              <p style={{ fontFamily: F, color: "#B0AAA2" }}>…</p>
            ) : (
              <>
                <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #E8E3DB" }}>
                  <div style={{ fontFamily: F, fontSize: 12, color: "#8A8580" }}>{userRole}</div>
                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{userEmail}</div>
                </div>
                <div style={{ display: "grid", gap: 12, maxHeight: 360, overflowY: "auto", marginBottom: 16 }}>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: 12,
                        border: "1px solid #F0EBE3",
                        background: m.fromAdmin ? "#FAF8F4" : "#FFFFFF",
                      }}
                    >
                      <div style={{ fontFamily: F, fontSize: 10, fontWeight: 600, color: m.fromAdmin ? "#8B7355" : "#1A1A1A" }}>
                        {m.fromAdmin ? tr("Admin", "관리자") : tr("User", "사용자")}
                      </div>
                      <div style={{ marginTop: 6, fontFamily: F, fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.text}</div>
                      <div style={{ marginTop: 6, fontFamily: F, fontSize: 10, color: "#C4BDB0" }}>{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={tr("Reply…", "답장…")}
                    rows={3}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      border: "1px solid #E8E3DB",
                      fontFamily: F,
                      fontSize: 13,
                      resize: "vertical",
                    }}
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    style={{
                      padding: "12px 18px",
                      border: "1px solid #1A1A1A",
                      background: sending || !reply.trim() ? "#E8E3DB" : "#1A1A1A",
                      color: sending || !reply.trim() ? "#8A8580" : "#FFF",
                      fontFamily: F,
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: sending || !reply.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {tr("Send", "보내기")}
                  </button>
                </div>
              </>
            )}
            {error && <p style={{ fontFamily: F, fontSize: 12, color: "#8B4A4A", marginTop: 12 }}>{error}</p>}
          </div>
        </div>
      </main>
    </>
  );
}
