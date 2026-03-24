"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type Msg = { id: string; fromAdmin: boolean; text: string; createdAt: string; readByRecipient?: boolean };
type PlatformUser = {
  id: string;
  email: string;
  role: string;
  name: string;
  country: string;
  city: string;
};

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
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [startRoleFilter, setStartRoleFilter] = useState<"all" | "artist" | "gallery" | "curator">("all");
  const [selectedNewUserIds, setSelectedNewUserIds] = useState<string[]>([]);
  const [newThreadText, setNewThreadText] = useState("");
  const [starting, setStarting] = useState(false);
  const [startResult, setStartResult] = useState<string | null>(null);
  const [startResultTone, setStartResultTone] = useState<"ok" | "error">("ok");
  const [broadcastRoleFilter, setBroadcastRoleFilter] = useState<"all" | "artist" | "gallery" | "curator">("all");
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);
  const [broadcastResultTone, setBroadcastResultTone] = useState<"ok" | "error">("ok");
  /** 목록 API 실패 */
  const [threadsError, setThreadsError] = useState<string | null>(null);
  /** 스레드 열기 / 답장 실패 */
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    setThreadsError(null);
    try {
      const res = await fetch("/api/admin/support/threads", { credentials: "include", cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setThreadsError((data?.message as string) || data?.error || "Failed");
        return;
      }
      setThreads(data.threads || []);
      setNeedingReply(data.threadsNeedingReply ?? 0);
    } catch {
      setThreadsError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users?excludeBots=true", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.users)) {
        return;
      }
      setPlatformUsers(
        data.users.map((u: any) => ({
          id: String(u.id || ""),
          email: String(u.email || ""),
          role: String(u.role || ""),
          name: String(u.name || ""),
          country: String(u.country || ""),
          city: String(u.city || ""),
        }))
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [router]);

  useEffect(() => {
    loadThreads();
    loadUsers();
  }, [loadThreads, loadUsers]);

  useEffect(() => {
    if (selectedNewUserIds.length === 0) return;
    setSelectedNewUserIds((prev) =>
      prev.filter((id) => {
        const selected = platformUsers.find((u) => u.id === id);
        if (!selected) return false;
        if (startRoleFilter !== "all" && selected.role !== startRoleFilter) return false;
        return true;
      })
    );
  }, [startRoleFilter, selectedNewUserIds.length, platformUsers]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return platformUsers.filter((u) => {
      if (startRoleFilter !== "all" && u.role !== startRoleFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.country.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q)
      );
    });
  }, [platformUsers, userQuery, startRoleFilter]);

  const allFilteredSelected =
    filteredUsers.length > 0 && filteredUsers.every((u) => selectedNewUserIds.includes(u.id));

  const broadcastTargetCount = useMemo(() => {
    if (broadcastRoleFilter === "all") return platformUsers.length;
    return platformUsers.filter((u) => u.role === broadcastRoleFilter).length;
  }, [platformUsers, broadcastRoleFilter]);

  async function openThread(id: string) {
    setSelectedId(id);
    setMsgLoading(true);
    setMessages([]);
    setReply("");
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/support/${id}/messages`, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setDetailError((data?.message as string) || data?.error || "Failed");
        return;
      }
      setUserEmail(data.thread?.userEmail || "");
      setUserRole(data.thread?.userRole || "");
      setMessages(data.messages || []);
    } catch {
      setDetailError("Network error");
    } finally {
      setMsgLoading(false);
    }
  }

  async function sendReply() {
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/support/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: reply.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setDetailError((data?.message as string) || data?.error || "Failed");
        return;
      }
      setReply("");
      setMessages((prev) => [...prev, { ...data.message, readByRecipient: data.message.readByRecipient ?? false }]);
      loadThreads();
    } catch {
      setDetailError("Network error");
    } finally {
      setSending(false);
    }
  }

  async function startConversation() {
    const text = newThreadText.trim();
    if (selectedNewUserIds.length === 0 || !text || starting) return;
    setStarting(true);
    setStartResult(null);
    setStartResultTone("ok");
    setDetailError(null);
    try {
      const res = await fetch("/api/admin/support/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetMode: "selected", userIds: selectedNewUserIds, text }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok || !data?.ok) {
        setStartResultTone("error");
        setStartResult((data?.message as string) || data?.error || "Failed");
        return;
      }
      setNewThreadText("");
      setStartResultTone("ok");
      setStartResult(
        tr(
          `Sent to selected users: ${data.sent}/${data.total}`,
          `선택 사용자 발송 완료: ${data.sent}/${data.total}`
        )
      );
      await loadThreads();
      if (data?.threadId) {
        await openThread(String(data.threadId));
      }
    } catch {
      setStartResultTone("error");
      setStartResult("Network error");
    } finally {
      setStarting(false);
    }
  }

  async function sendBroadcastMessage() {
    const text = broadcastText.trim();
    if (!text || broadcasting) return;
    setBroadcasting(true);
    setBroadcastResult(null);
    setBroadcastResultTone("ok");
    const roles =
      broadcastRoleFilter === "all"
        ? ["artist", "gallery", "curator"]
        : [broadcastRoleFilter];
    try {
      const res = await fetch("/api/admin/support/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetMode: "broadcast",
          roles,
          text,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok || !data?.ok) {
        setBroadcastResultTone("error");
        setBroadcastResult((data?.message as string) || data?.error || "Failed");
        return;
      }
      setBroadcastText("");
      setBroadcastResultTone("ok");
      setBroadcastResult(
        tr(
          `Broadcast sent: ${data.sent}/${data.total}`,
          `전체 발송 완료: ${data.sent}/${data.total}`
        )
      );
      await loadThreads();
    } catch {
      setBroadcastResultTone("error");
      setBroadcastResult("Network error");
    } finally {
      setBroadcasting(false);
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

        {threadsError && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              background: "rgba(139,74,74,0.06)",
              border: "1px solid rgba(139,74,74,0.2)",
              fontFamily: F,
              fontSize: 13,
              color: "#8B4A4A",
              lineHeight: 1.6,
            }}
          >
            {threadsError}
          </div>
        )}

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

        <div
          style={{
            marginBottom: 18,
            border: "1px solid #E8E3DB",
            background: "#FFFFFF",
            padding: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontFamily: F, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8580" }}>
            {tr("Broadcast to users", "가입자 전체 쪽지")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["all", "artist", "gallery", "curator"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setBroadcastRoleFilter(role)}
                style={{
                  border: "1px solid #E8E3DB",
                  background: broadcastRoleFilter === role ? "#1A1A1A" : "#FFFFFF",
                  color: broadcastRoleFilter === role ? "#FFFFFF" : "#8A8580",
                  padding: "6px 8px",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {role}
              </button>
            ))}
            <span style={{ fontFamily: F, fontSize: 11, color: "#8A8580", alignSelf: "center" }}>
              {tr("Targets", "대상")}: {broadcastTargetCount}
            </span>
          </div>
          <textarea
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            rows={3}
            placeholder={tr("Write message to all selected users...", "선택한 전체 가입자에게 보낼 메시지를 입력하세요...")}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #E8E3DB",
              fontFamily: F,
              fontSize: 13,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={sendBroadcastMessage}
              disabled={broadcasting || !broadcastText.trim() || broadcastTargetCount === 0}
              style={{
                padding: "10px 14px",
                border: "1px solid #1A1A1A",
                background: broadcasting || !broadcastText.trim() || broadcastTargetCount === 0 ? "#E8E3DB" : "#1A1A1A",
                color: broadcasting || !broadcastText.trim() || broadcastTargetCount === 0 ? "#8A8580" : "#FFF",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: broadcasting || !broadcastText.trim() || broadcastTargetCount === 0 ? "not-allowed" : "pointer",
              }}
            >
              {broadcasting ? tr("Sending...", "전송 중...") : tr("Send to all", "전체 발송")}
            </button>
            {broadcastResult && (
              <span style={{ fontFamily: F, fontSize: 12, color: broadcastResultTone === "ok" ? "#5A7A5A" : "#8B4A4A" }}>
                {broadcastResult}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            marginBottom: 18,
            border: "1px solid #E8E3DB",
            background: "#FFFFFF",
            padding: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontFamily: F, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8580" }}>
            {tr("Start a new conversation", "새 쪽지 시작")}
          </div>
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder={tr("Search user/email/country...", "사용자/이메일/국가 검색...")}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #E8E3DB",
              fontFamily: F,
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["all", "artist", "gallery", "curator"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setStartRoleFilter(role)}
                style={{
                  border: "1px solid #E8E3DB",
                  background: startRoleFilter === role ? "#1A1A1A" : "#FFFFFF",
                  color: startRoleFilter === role ? "#FFFFFF" : "#8A8580",
                  padding: "6px 8px",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {role}
              </button>
            ))}
          </div>
          <input
            value={
              selectedNewUserIds.length > 0
                ? (() => {
                    if (selectedNewUserIds.length === 1) {
                      const selected = platformUsers.find((u) => u.id === selectedNewUserIds[0]);
                      if (!selected) return "";
                      return `[${selected.role}] ${selected.name || "-"} · ${selected.email}`;
                    }
                    return tr(
                      `${selectedNewUserIds.length} users selected`,
                      `${selectedNewUserIds.length}명 선택됨`
                    );
                  })()
                : ""
            }
            readOnly
            placeholder={tr("Select users below", "아래에서 가입자를 선택하세요")}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #E8E3DB",
              fontFamily: F,
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              border: "1px solid #E8E3DB",
              background: "#FFFFFF",
              maxHeight: 170,
              overflowY: "auto",
            }}
          >
            {loadingUsers ? (
              <div style={{ padding: "10px 12px", fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: "10px 12px", fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>
                {tr("No users found.", "사용자가 없습니다.")}
              </div>
            ) : (
              <>
                <div style={{ padding: "8px 10px", borderBottom: "1px solid #F0EBE3", display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedNewUserIds(Array.from(new Set([...selectedNewUserIds, ...filteredUsers.map((u) => u.id)])));
                      } else {
                        const filteredSet = new Set(filteredUsers.map((u) => u.id));
                        setSelectedNewUserIds(selectedNewUserIds.filter((id) => !filteredSet.has(id)));
                      }
                    }}
                  />
                  <span style={{ fontFamily: F, fontSize: 11, color: "#6F6A64" }}>
                    {tr("Select all in current filter", "현재 필터 전체 선택")}
                  </span>
                </div>
                {filteredUsers.slice(0, 300).map((u) => (
                  <label
                    key={u.id}
                    style={{
                      width: "100%",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      borderBottom: "1px solid #F0EBE3",
                      background: selectedNewUserIds.includes(u.id) ? "#FAF8F4" : "#FFFFFF",
                      padding: "9px 10px",
                      fontFamily: F,
                      fontSize: 12,
                      color: "#1A1A1A",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNewUserIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedNewUserIds(Array.from(new Set([...selectedNewUserIds, u.id])));
                        else setSelectedNewUserIds(selectedNewUserIds.filter((id) => id !== u.id));
                      }}
                    />
                    <span>
                      [{u.role}] {u.name || "-"} · {u.email} {u.country ? `· ${u.country}/${u.city || "-"}` : ""}
                    </span>
                  </label>
                ))}
              </>
            )}
          </div>
          <textarea
            value={newThreadText}
            onChange={(e) => setNewThreadText(e.target.value)}
            rows={3}
            placeholder={tr("Write first message...", "첫 메시지를 입력하세요...")}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #E8E3DB",
              fontFamily: F,
              fontSize: 13,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={startConversation}
              disabled={starting || selectedNewUserIds.length === 0 || !newThreadText.trim()}
              style={{
                padding: "10px 14px",
                border: "1px solid #1A1A1A",
                background: starting || selectedNewUserIds.length === 0 || !newThreadText.trim() ? "#E8E3DB" : "#1A1A1A",
                color: starting || selectedNewUserIds.length === 0 || !newThreadText.trim() ? "#8A8580" : "#FFF",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: starting || selectedNewUserIds.length === 0 || !newThreadText.trim() ? "not-allowed" : "pointer",
              }}
            >
              {starting ? tr("Sending...", "전송 중...") : tr("Start and send", "시작하고 보내기")}
            </button>
            {startResult && (
              <span style={{ fontFamily: F, fontSize: 12, color: startResultTone === "ok" ? "#5A7A5A" : "#8B4A4A" }}>
                {startResult}
              </span>
            )}
          </div>
        </div>

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
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontFamily: F, fontSize: 10, color: "#C4BDB0" }}>{new Date(m.createdAt).toLocaleString()}</span>
                        {m.fromAdmin && m.readByRecipient ? (
                          <span style={{ fontFamily: F, fontSize: 10, color: "#7A9A7A" }}>
                            {tr("Read by user", "사용자 읽음")}
                          </span>
                        ) : null}
                      </div>
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
            {selectedId && detailError && (
              <p style={{ fontFamily: F, fontSize: 12, color: "#8B4A4A", marginTop: 12 }}>{detailError}</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
