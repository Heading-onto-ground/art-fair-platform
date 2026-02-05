"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";

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
      <main style={{ padding: "28px 24px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>Chats</h1>
            <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
              {session ? <>Signed in as <b style={{ color: "#111" }}>{me?.profile?.name || userId}</b> ({role})</> : "Checking session..."}
            </p>
          </div>
          <button onClick={load} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e5e5", background: "white", color: "#888", fontWeight: 500, fontSize: 12, cursor: "pointer" }}>
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: 14, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#888", padding: 20 }}>Loading...</p>
        ) : rooms.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", background: "white", border: "1px solid #e5e5e5", borderRadius: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <p style={{ color: "#888", marginBottom: 16 }}>No chats yet. Go contact a gallery from Open Calls!</p>
            <button onClick={() => router.push("/open-calls")} style={{ padding: "12px 20px", borderRadius: 8, border: "none", background: "#6366f1", color: "white", fontWeight: 600, cursor: "pointer" }}>
              Browse Open Calls
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rooms.map((r) => {
              const last = r.messages?.[r.messages.length - 1];
              const counterpart = role === "artist" ? r.galleryId : r.artistId;
              return (
                <button
                  key={r.id}
                  onClick={() => router.push(`/chat/${r.id}`)}
                  style={{ textAlign: "left", background: "white", border: "1px solid #e5e5e5", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.15s", width: "100%" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6366f1"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e5e5"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: role === "artist" ? "#ec4899" : "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "white" }}>
                        {role === "artist" ? "🏛️" : "🎨"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#111" }}>{role === "artist" ? "Gallery" : "Artist"}: {counterpart.slice(0, 20)}</div>
                        <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Room: {r.id.slice(0, 12)}...</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{last?.createdAt ? new Date(last.createdAt).toLocaleString() : ""}</div>
                  </div>
                  <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "#f9f9f9", fontSize: 13, color: "#555" }}>
                    {last ? <><b style={{ color: "#111" }}>{last.senderId === userId ? "You" : last.senderId.slice(0, 8)}:</b> {last.text.slice(0, 60)}{last.text.length > 60 ? "..." : ""}</> : <span style={{ opacity: 0.6 }}>No messages yet</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/open-calls")} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e5e5", background: "white", color: "#555", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Open Calls</button>
          <button onClick={() => router.push("/")} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e5e5", background: "white", color: "#555", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Home</button>
        </div>
      </main>
    </>
  );
}
