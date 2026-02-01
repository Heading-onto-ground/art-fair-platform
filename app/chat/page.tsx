"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type Role = "artist" | "gallery";

type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

type ChatRoom = {
  id: string;
  openCallId: string;
  artistId: string;
  galleryId: string;
  messages: { createdAt: number; text: string; senderId: string }[];
};

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch {
    return null;
  }
}

export default function ChatListPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const session = me?.session;

  const headers = useMemo(() => {
    if (!session) return {};
    return {
      "x-user-id": session.userId,
      "x-user-role": session.role,
    };
  }, [session]);

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

      // 2) chats 불러오기
      const res = await fetch("/api/chats", {
        headers: {
          "x-user-id": s.userId,
          "x-user-role": s.role,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      setRooms(Array.isArray(data?.rooms) ? data.rooms : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load chats");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = session?.role;
  const userId = session?.userId;

  return (
    <>
      <TopBar />
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>Chats 💬</h1>
          <button onClick={load} style={{ padding: "10px 12px" }}>
            Refresh
          </button>
        </div>

        <p style={{ marginTop: 6, opacity: 0.7 }}>
          {session ? (
            <>
              Signed in: <b>{userId}</b> ({role})
            </>
          ) : (
            "Checking session…"
          )}
        </p>

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
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          {loading ? (
            <p>Loading…</p>
          ) : rooms.length === 0 ? (
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 14,
                padding: 16,
                background: "#fff",
                opacity: 0.9,
              }}
            >
              No chats yet. Go contact a gallery from Open Calls ✨
              <div style={{ marginTop: 10 }}>
                <button onClick={() => router.push("/open-calls")}>
                  ← Open Calls
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {rooms.map((r) => {
                const last = r.messages?.[r.messages.length - 1];
                const counterpart =
                  role === "artist" ? r.galleryId : r.artistId;

                return (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/chat/${r.id}`)} // ✅ 쿼리 제거
                    style={{
                      textAlign: "left",
                      border: "1px solid rgba(0,0,0,0.12)",
                      borderRadius: 14,
                      padding: 14,
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>
                        {role === "artist" ? "🏛️ Gallery" : "🎨 Artist"}:{" "}
                        {counterpart}
                      </div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>
                        {last?.createdAt
                          ? new Date(last.createdAt).toLocaleString()
                          : ""}
                      </div>
                    </div>

                    <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                      OpenCall: <b>{r.openCallId}</b> · Room: {r.id}
                    </div>

                    <div style={{ marginTop: 8, opacity: 0.9 }}>
                      {last ? (
                        <>
                          <b>
                            {last.senderId === userId ? "You" : last.senderId}:
                          </b>{" "}
                          {last.text}
                        </>
                      ) : (
                        <span style={{ opacity: 0.7 }}>No messages yet</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/open-calls")}>← Open Calls</button>
          <button onClick={() => router.push("/")}>Home</button>
        </div>
      </main>
    </>
  );
}