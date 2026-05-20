"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";

type Item = {
  id: string;
  userId: string;
  userEmail: string | null;
  artistId: string | null;
  artistName: string | null;
  anonymousAlias: string;
  title: string;
  content: string;
  workLinks: string | null;
  rejectionContext: string | null;
  emotion: string | null;
  status: "pending" | "published" | "rejected";
  adminNote: string | null;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
};

export default function AdminRejectedArtistsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "published" | "rejected">("pending");
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        if (data?.authenticated) setAuthenticated(true);
        else {
          setAuthenticated(false);
          router.replace("/admin/login");
        }
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!authenticated) return;
    loadItems();
  }, [authenticated, filter]);

  async function loadItems() {
    setLoading(true);
    setMsg(null);
    const query = filter === "all" ? "" : `?status=${filter}`;
    try {
      const res = await fetch(`/api/admin/rejected-artists${query}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      setItems(Array.isArray(data?.testimonies) ? data.testimonies : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function review(id: string, action: "publish" | "reject") {
    setWorkingId(id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/rejected-artists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id,
          action,
          adminNote: noteById[id] || "",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "update_failed");
      setMsg(action === "publish" ? "공개 처리되었습니다." : "보류 처리되었습니다.");
      await loadItems();
    } catch (e: any) {
      setMsg(e?.message || "처리에 실패했습니다.");
    } finally {
      setWorkingId(null);
    }
  }

  if (authenticated === null) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FDFBF7" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>인증 중...</p>
      </main>
    );
  }
  if (!authenticated) return null;

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 32px 72px" }}>
        <div style={{ marginBottom: 22 }}>
          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            Admin
          </span>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, marginTop: 8, marginBottom: 8 }}>
            증명 거절 사례 검수
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", lineHeight: 1.7, margin: 0 }}>
            작성자는 내부적으로 식별되며, 공개 시에는 익명 별칭만 노출됩니다.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {(["pending", "published", "rejected", "all"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                padding: "7px 14px",
                border: `1px solid ${filter === k ? "#1A1A1A" : "#E8E3DB"}`,
                background: filter === k ? "#1A1A1A" : "#FFFFFF",
                color: filter === k ? "#FFFFFF" : "#8A8580",
                fontFamily: F,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {k}
            </button>
          ))}
        </div>

        {msg ? (
          <div style={{ marginBottom: 14, padding: "10px 12px", border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 12, color: "#6A6A6A" }}>
            {msg}
          </div>
        ) : null}

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>불러오는 중...</p>
        ) : items.length === 0 ? (
          <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>표시할 사례가 없습니다.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <article key={item.id} style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 8 }}>
                  <h2 style={{ margin: 0, fontFamily: F, fontSize: 15, color: "#1A1A1A" }}>{item.title}</h2>
                  <span style={{ fontFamily: F, fontSize: 11, color: "#8A8580" }}>{item.status}</span>
                </div>
                <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginBottom: 8 }}>
                  공개명: {item.anonymousAlias} | 작성자: {item.artistName || "-"} ({item.userEmail || "unknown"})
                </div>
                <p style={{ margin: "0 0 8px", fontFamily: F, fontSize: 12, color: "#4A4A4A", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {item.content}
                </p>
                <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginBottom: 10 }}>
                  {item.rejectionContext ? `거절 맥락: ${item.rejectionContext} | ` : ""}
                  {item.emotion ? `감정: ${item.emotion} | ` : ""}
                  {item.workLinks ? `링크: ${item.workLinks}` : ""}
                </div>

                <textarea
                  value={noteById[item.id] ?? item.adminNote ?? ""}
                  onChange={(e) => setNoteById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="운영 메모 (공개/보류 사유)"
                  style={{ width: "100%", minHeight: 64, resize: "vertical", border: "1px solid #E8E3DB", padding: "8px 10px", fontFamily: F, fontSize: 12, marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => review(item.id, "publish")}
                    disabled={workingId === item.id}
                    style={{ padding: "8px 12px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FFFFFF", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", opacity: workingId === item.id ? 0.7 : 1 }}
                  >
                    공개
                  </button>
                  <button
                    onClick={() => review(item.id, "reject")}
                    disabled={workingId === item.id}
                    style={{ padding: "8px 12px", border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#6E655B", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", opacity: workingId === item.id ? 0.7 : 1 }}
                  >
                    보류
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
