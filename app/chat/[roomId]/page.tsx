"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type Role = "artist" | "gallery";

type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
};

type RoomInfo = {
  id: string;
  openCallId: string;
  artistId: string;
  galleryId: string;
};

type ArtistProfile = {
  id: string;
  userId: string;
  role: "artist";
  email: string;
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  portfolioUrl?: string;
};

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch {
    return null;
  }
}

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  const router = useRouter();

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

  async function load() {
    try {
      setError(null);
      setLoading(true);

      // 1) 세션 확인
      const m = await fetchMe();
      const s = m?.session;
      if (!s) {
        router.replace("/login");
        return;
      }
      setMe(m);

      // 2) 메시지 로드 (✅ 헤더 없이, 서버가 세션으로 판단)
      const res = await fetch(`/api/chat/${params.roomId}`, {
        cache: "no-store",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      const r = (data?.room ?? null) as RoomInfo | null;
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setRoom(r);

      if (s.role === "gallery" && r?.artistId) {
        const profRes = await fetch(
          `/api/public/artist/${encodeURIComponent(r.artistId)}`,
          { cache: "no-store" }
        );
        const profData = await profRes.json().catch(() => null);
        setArtistProfile(profRes.ok ? (profData?.profile ?? null) : null);
      } else {
        setArtistProfile(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load messages");
      setMessages([]);
      setRoom(null);
      setArtistProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.roomId]);

  async function send() {
    const v = text.trim();
    if (!v) return;

    setSending(true);
    setError(null);

    try {
      // 세션 없으면 로그인
      const m = me ?? (await fetchMe());
      const s = m?.session;
      if (!s) {
        router.push("/login");
        return;
      }

      // ✅ senderId를 보내지 않는다. 서버가 세션.userId로 고정한다.
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roomId: params.roomId, text: v }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to send");

      setText("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <TopBar />
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <button onClick={() => router.back()} style={{ marginBottom: 12 }}>
          ← Back
        </button>

        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Chat 💬</h1>
        <p style={{ opacity: 0.7, marginTop: 6 }}>
          room: <b>{params.roomId}</b>
          {session && (
            <>
              {" "}
              · you: <b>{userId}</b> ({role})
            </>
          )}
        </p>

        {role === "gallery" && artistProfile ? (
          <div
            style={{
              marginTop: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 900 }}>🎨 Artist Profile</div>
            <div style={{ marginTop: 6 }}>
              <b>{artistProfile.name || artistProfile.userId}</b>
            </div>
            <div style={{ marginTop: 4, opacity: 0.8, fontSize: 13 }}>
              {artistProfile.city}, {artistProfile.country} · {artistProfile.email}
            </div>
            {artistProfile.bio ? (
              <div style={{ marginTop: 8, opacity: 0.9 }}>{artistProfile.bio}</div>
            ) : null}
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {artistProfile.website ? (
                <a
                  href={artistProfile.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontWeight: 800, textDecoration: "none" }}
                >
                  🔗 Website
                </a>
              ) : null}
              {artistProfile.portfolioUrl ? (
                <a
                  href={artistProfile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 900,
                    textDecoration: "none",
                  }}
                >
                  📄 View Portfolio
                </a>
              ) : (
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  No portfolio uploaded
                </span>
              )}
              {room?.openCallId ? (
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  OpenCall: {room.openCallId}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {error && (
          <div
            style={{
              marginTop: 12,
              border: "1px solid rgba(255,80,80,0.5)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <b>Error:</b> {error}
            {(error === "room not found" || error.includes("room not found")) && (
              <div style={{ marginTop: 10 }}>
                <button onClick={() => router.push("/chats")}>
                  ← Back to Chats
                </button>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 14,
            padding: 14,
            minHeight: 280,
            background: "#fff",
          }}
        >
          {loading ? (
            <p>Loading…</p>
          ) : messages.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No messages yet. Say hello 👋</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.10)",
                    opacity: 0.95,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {m.senderId === userId ? "You" : m.senderId}
                  </div>
                  <div style={{ marginTop: 4 }}>{m.text}</div>
                  <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            style={{
              flex: 1,
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.16)",
              background: "#fff",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            onClick={send}
            disabled={sending}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              minWidth: 90,
            }}
          >
            {sending ? "..." : "Send"}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={() => router.push("/chats")}>← Back to Chats</button>
        </div>
      </main>
    </>
  );
}