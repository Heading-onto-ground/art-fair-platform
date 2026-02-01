"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import Link from "next/link";

type Role = "artist" | "gallery";
type Session = { userId: string; role: Role; email?: string };
type MeResponse = { session: Session | null; profile: any | null };

export default function ChatIndexPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [roomId, setRoomId] = useState<string>(() => `room_${Date.now()}`);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: MeResponse) => {
        if (!d.session) router.push("/login");
        else setSession(d.session);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 760, margin: "30px auto", padding: "0 12px" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>💬 Chats</h1>

        <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {session ? (
              <>
                Signed in: <b>{session.userId}</b> ({session.role})
              </>
            ) : (
              "Loading…"
            )}
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontWeight: 900, marginBottom: 8 }}>Enter a room</div>

          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={`/chat/${encodeURIComponent(roomId)}`}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Open Room →
            </Link>

            <button
              onClick={() => setRoomId(`room_${Date.now()}`)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              New room id
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
