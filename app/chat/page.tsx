"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";

type MeResponse = { session: { userId: string; role: "artist" | "gallery"; email?: string } | null; profile: any | null };
type ChatRoom = { id: string; openCallId: string; artistId: string; galleryId: string; messages: { createdAt: number; text: string; senderId: string }[] };

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch { return null; }
}

export default function ChatListPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const session = me?.session;

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const m = await fetchMe();
      const s = m?.session;
      if (!s) { router.replace("/login"); return; }
      setMe(m);
      const res = await fetch("/api/chats", { headers: { "x-user-id": s.userId, "x-user-role": s.role }, cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setRooms(Array.isArray(data?.rooms) ? data.rooms : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const role = session?.role;
  const userId = session?.userId;

  return (
    <>
      <TopBar />
      <main style={{ padding: "48px 40px", maxWidth: 1000, margin: "0 auto" }}>
        {/* Header - Margiela Style */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
          <div>
            <span
              style={{
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#8A8A8A",
              }}
            >
              Communication
            </span>
            <h1
              style={{
                fontFamily: S,
                fontSize: 42,
                fontWeight: 300,
                color: "#1A1A1A",
                marginTop: 8,
                letterSpacing: "-0.01em",
              }}
            >
              Messages
            </h1>
            <p
              style={{
                fontFamily: F,
                fontSize: 12,
                color: "#8A8A8A",
                marginTop: 8,
                letterSpacing: "0.02em",
              }}
            >
              {session ? (
                <>Signed in as {me?.profile?.name || userId} ({role})</>
              ) : (
                "Checking session..."
              )}
            </p>
          </div>
          <button
            onClick={load}
            style={{
              padding: "10px 20px",
              border: "1px solid #E5E0DB",
              background: "transparent",
              color: "#4A4A4A",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 32,
              padding: 20,
              border: "1px solid #D4B0B0",
              background: "#FDF8F8",
              color: "#8B3A3A",
              fontFamily: F,
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#8A8A8A" }}>
            <span style={{ fontFamily: F, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Loading...
            </span>
          </div>
        ) : rooms.length === 0 ? (
          <div
            style={{
              padding: 64,
              textAlign: "center",
              background: "#FFFFFF",
              border: "1px solid #E5E0DB",
            }}
          >
            <p
              style={{
                fontFamily: S,
                fontSize: 24,
                fontStyle: "italic",
                color: "#8A8A8A",
                marginBottom: 24,
              }}
            >
              No conversations yet
            </p>
            <p
              style={{
                fontFamily: F,
                fontSize: 12,
                color: "#8A8A8A",
                marginBottom: 32,
                letterSpacing: "0.02em",
              }}
            >
              Start a conversation by contacting a gallery from Open Calls
            </p>
            <button
              onClick={() => router.push("/open-calls")}
              style={{
                padding: "14px 32px",
                border: "1px solid #1A1A1A",
                background: "#1A1A1A",
                color: "#FFFFFF",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Browse Open Calls
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 1, background: "#E5E0DB" }}>
            {rooms.map((r, index) => {
              const last = r.messages?.[r.messages.length - 1];
              const counterpart = role === "artist" ? r.galleryId : r.artistId;
              return (
                <button
                  key={r.id}
                  onClick={() => router.push(`/chat/${r.id}`)}
                  style={{
                    textAlign: "left",
                    background: "#FFFFFF",
                    border: "none",
                    padding: 28,
                    cursor: "pointer",
                    width: "100%",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FAF8F5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                        <span
                          style={{
                            fontFamily: F,
                            fontSize: 10,
                            color: "#B0B0B0",
                            letterSpacing: "0.1em",
                          }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          style={{
                            fontFamily: F,
                            fontSize: 10,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: "#8A8A8A",
                          }}
                        >
                          {role === "artist" ? "Gallery" : "Artist"}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontFamily: S,
                          fontSize: 20,
                          fontWeight: 400,
                          color: "#1A1A1A",
                          marginBottom: 12,
                        }}
                      >
                        {counterpart.slice(0, 24)}
                      </h3>
                      <div
                        style={{
                          padding: "12px 16px",
                          background: "#FAF8F5",
                          fontFamily: F,
                          fontSize: 13,
                          color: "#4A4A4A",
                          lineHeight: 1.5,
                        }}
                      >
                        {last ? (
                          <>
                            <span style={{ color: "#8A8A8A" }}>
                              {last.senderId === userId ? "You" : last.senderId.slice(0, 8)}:
                            </span>{" "}
                            {last.text.slice(0, 80)}{last.text.length > 80 ? "..." : ""}
                          </>
                        ) : (
                          <span style={{ color: "#8A8A8A", fontStyle: "italic" }}>No messages yet</span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: F,
                        fontSize: 10,
                        color: "#B0B0B0",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {last?.createdAt ? new Date(last.createdAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div style={{ marginTop: 48, display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push("/open-calls")}
            style={{
              padding: "12px 24px",
              border: "1px solid #E5E0DB",
              background: "transparent",
              color: "#4A4A4A",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Open Calls
          </button>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "12px 24px",
              border: "1px solid #E5E0DB",
              background: "transparent",
              color: "#4A4A4A",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Home
          </button>
        </div>
      </main>
    </>
  );
}
