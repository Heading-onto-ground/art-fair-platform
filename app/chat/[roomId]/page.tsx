"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { LANGUAGE_NAMES, type SupportedLang } from "@/lib/translateApi";
import { F, S, colors } from "@/lib/design";

type Role = "artist" | "gallery";
type MeResponse = { session: { userId: string; role: Role; email?: string } | null; profile: any | null };
type Message = { id: string; senderId: string; text: string; createdAt: number; translated?: string; showTranslation?: boolean };
type RoomInfo = { id: string; openCallId: string; artistId: string; galleryId: string };
type ArtistProfile = { id: string; userId: string; role: "artist"; email: string; name: string; country: string; city: string; website?: string; bio?: string; portfolioUrl?: string };

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch { return null; }
}

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [me, setMe] = useState<MeResponse | null>(null);
  const session = me?.session;
  const userId = session?.userId || "";
  const role = session?.role || "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translating, setTranslating] = useState<Set<string>>(new Set());
  const [sseConnected, setSseConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  async function translateMessage(msgId: string, msgText: string) {
    if (translating.has(msgId)) return;
    setTranslating((prev) => new Set(prev).add(msgId));
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: msgText, targetLang: lang }) });
      const data = await res.json();
      if (data.ok && data.translated) setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, translated: data.translated, showTranslation: true } : m));
    } catch (e) { console.error(e); }
    finally {
      setTranslating((prev) => { const next = new Set(prev); next.delete(msgId); return next; });
    }
  }

  function toggleTranslation(msgId: string) {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, showTranslation: !m.showTranslation } : m));
  }

  useEffect(() => {
    if (autoTranslate && messages.length > 0) {
      messages.forEach((m) => { if (!m.translated && m.senderId !== userId) translateMessage(m.id, m.text); });
    }
  }, [autoTranslate, messages.length]); // eslint-disable-line

  // 초기 로드
  async function load() {
    try {
      setError(null);
      setLoading(true);
      const m = await fetchMe();
      if (!m?.session) { router.replace("/login"); return; }
      setMe(m);
      const res = await fetch(`/api/chat/${params.roomId}`, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      const r = (data?.room ?? null) as RoomInfo | null;
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setRoom(r);
      if (m.session.role === "gallery" && r?.artistId) {
        const profRes = await fetch(`/api/public/artist/${encodeURIComponent(r.artistId)}`, { cache: "no-store" });
        const profData = await profRes.json().catch(() => null);
        setArtistProfile(profRes.ok ? (profData?.profile ?? null) : null);
      } else setArtistProfile(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
      setMessages([]);
      setRoom(null);
      setArtistProfile(null);
    } finally {
      setLoading(false);
    }
  }

  // SSE 연결 (초기 로드 완료 후)
  useEffect(() => {
    load();
  }, [params.roomId]); // eslint-disable-line

  useEffect(() => {
    if (loading || !session) return;

    // 기존 SSE 연결 정리
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const sse = new EventSource(`/api/chat/${params.roomId}/sse`);
    sseRef.current = sse;

    sse.addEventListener("connected", () => {
      setSseConnected(true);
    });

    sse.addEventListener("messages", (e) => {
      try {
        const newMsgs: Message[] = JSON.parse(e.data);
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      } catch {
        // parse error 무시
      }
    });

    sse.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      sse.close();
      sseRef.current = null;
      setSseConnected(false);
    };
  }, [loading, session, params.roomId]); // eslint-disable-line

  // 새 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const v = text.trim();
    if (!v) return;
    setSending(true);
    setError(null);
    try {
      const m = me ?? (await fetchMe());
      if (!m?.session) { router.push("/login"); return; }
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roomId: params.roomId, text: v }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setText("");
      // SSE가 연결되어 있으면 자동으로 수신됨. 아니면 수동 reload
      if (!sseConnected) await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <TopBar />
      <main style={{ padding: "32px 40px", maxWidth: 860, margin: "0 auto" }}>
        <button onClick={() => router.back()} style={{ marginBottom: 20, background: "transparent", border: "none", color: colors.textMuted, fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", cursor: "pointer" }}>
          &larr; Back
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: S, fontSize: 32, fontWeight: 400, color: colors.textPrimary, margin: 0 }}>Chat</h1>
            <p style={{ fontFamily: F, color: colors.textLight, marginTop: 4, fontSize: 11 }}>
              Room: <span style={{ color: colors.textMuted }}>{params.roomId}</span>
              {session && <> · You: <span style={{ color: colors.accent }}>{userId}</span> ({role})</>}
              {" · "}
              <span style={{ color: sseConnected ? colors.success : colors.textLight, fontSize: 10 }}>
                {sseConnected ? "● Live" : "○ Connecting…"}
              </span>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: F, fontSize: 11, color: colors.textLight }}>Auto-translate</span>
            <button
              onClick={() => setAutoTranslate(!autoTranslate)}
              style={{ padding: "6px 14px", border: `1px solid ${colors.border}`, background: autoTranslate ? colors.accent : "transparent", color: autoTranslate ? "#FFF" : colors.textMuted, fontFamily: F, fontSize: 10, fontWeight: 500, cursor: "pointer" }}
            >
              {autoTranslate ? "ON" : "OFF"}
            </button>
            <span style={{ fontFamily: F, fontSize: 10, color: colors.textLight }}>→ {LANGUAGE_NAMES[lang as SupportedLang] || lang}</span>
          </div>
        </div>

        {role === "gallery" && artistProfile && (
          <div style={{ marginBottom: 20, border: `1px solid ${colors.border}`, padding: 20, background: colors.bgCard }}>
            <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textMuted }}>Artist Profile</div>
            <div style={{ fontFamily: S, marginTop: 8, fontSize: 20, fontWeight: 400, color: colors.textPrimary }}>{artistProfile.name || artistProfile.userId}</div>
            <div style={{ fontFamily: F, marginTop: 4, color: colors.textMuted, fontSize: 12 }}>{artistProfile.city}, {artistProfile.country} · {artistProfile.email}</div>
            {artistProfile.bio && <div style={{ fontFamily: F, marginTop: 8, color: colors.textSecondary, fontSize: 13, fontWeight: 300, lineHeight: 1.6 }}>{artistProfile.bio}</div>}
            <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
              {artistProfile.website && <a href={artistProfile.website} target="_blank" rel="noreferrer" style={{ fontFamily: F, color: colors.accent, fontWeight: 500, textDecoration: "none", fontSize: 11 }}>Website →</a>}
              {artistProfile.portfolioUrl ? (
                <a href={`/api/portfolio?id=${encodeURIComponent(artistProfile.userId)}`} target="_blank" rel="noreferrer" style={{ padding: "8px 16px", background: colors.textPrimary, color: "#FFF", fontFamily: F, fontWeight: 500, textDecoration: "none", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  View Portfolio
                </a>
              ) : <span style={{ fontFamily: F, fontSize: 11, color: colors.textLight }}>No portfolio</span>}
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: 16, border: `1px solid rgba(139,74,74,0.2)`, background: "rgba(139,74,74,0.04)", color: colors.error, fontFamily: F, fontSize: 12 }}>{error}</div>
        )}

        {/* 메시지 영역 */}
        <div style={{ border: `1px solid ${colors.border}`, padding: 24, minHeight: 300, maxHeight: 500, overflowY: "auto", background: colors.bgCard }}>
          {loading ? (
            <p style={{ fontFamily: F, color: colors.textLight }}>Loading...</p>
          ) : messages.length === 0 ? (
            <p style={{ fontFamily: F, color: colors.textLight }}>No messages yet. Say hello.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {messages.map((m) => {
                const isMine = m.senderId === userId;
                const isT = translating.has(m.id);
                return (
                  <div key={m.id} style={{ padding: 16, border: `1px solid ${colors.borderLight}`, background: isMine ? colors.bgSecondary : colors.bgCard }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: F, fontWeight: 500, color: isMine ? colors.accent : colors.textPrimary, fontSize: 11, letterSpacing: "0.04em" }}>
                        {isMine ? "You" : m.senderId}
                      </span>
                      {!isMine && (
                        <button
                          onClick={() => { if (m.translated) toggleTranslation(m.id); else translateMessage(m.id, m.text); }}
                          disabled={isT}
                          style={{ padding: "3px 10px", border: `1px solid ${colors.border}`, background: m.showTranslation ? colors.bgAccent : "transparent", fontSize: 10, color: colors.textMuted, cursor: isT ? "wait" : "pointer", fontFamily: F }}
                        >
                          {isT ? "..." : m.showTranslation ? "Original" : "Translate"}
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: 8, fontFamily: F, fontSize: 14, color: colors.textPrimary, fontWeight: 300, lineHeight: 1.6 }}>
                      {m.showTranslation && m.translated ? (
                        <>
                          <div style={{ color: colors.accent }}>{m.translated}</div>
                          <div style={{ marginTop: 6, fontSize: 12, color: colors.textLight, fontStyle: "italic" }}>Original: {m.text}</div>
                        </>
                      ) : m.text}
                    </div>
                    <div style={{ marginTop: 8, color: colors.borderDark, fontSize: 10, fontFamily: F }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 입력 */}
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, padding: "14px 16px", border: `1px solid ${colors.border}`, background: colors.bgCard, color: colors.textPrimary, fontFamily: F, fontSize: 14, outline: "none" }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button
            onClick={send}
            disabled={sending}
            style={{ padding: "14px 28px", border: "none", background: sending ? colors.textMuted : colors.textPrimary, color: colors.bgPrimary, fontFamily: F, fontWeight: 500, cursor: sending ? "not-allowed" : "pointer", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", minWidth: 80 }}
          >
            {sending ? "..." : "Send"}
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <button onClick={() => router.push("/chat")} style={{ background: "transparent", border: "none", color: colors.textLight, fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", cursor: "pointer" }}>
            &larr; Back to chats
          </button>
        </div>
      </main>
    </>
  );
}
