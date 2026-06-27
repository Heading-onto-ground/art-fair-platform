"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import GatheringManager from "@/app/components/GatheringManager";
import { F, S, colors } from "@/lib/design";

type Tab = "gatherings" | "moderation" | "members";
type Post = { id: string; title: string | null; caption: string | null; imageUrl: string; isPublic: boolean; createdAt: number; artistName: string; artistId: string | null };
type Member = { id: string; role: string; name: string; location: string; joined: number };
type MemberStats = { total: number; artists: number; galleries: number; curators: number };

export default function OperatorConsolePage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("gatherings");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/operator/me", { cache: "no-store" });
        if (!res.ok) {
          setAuthed(false);
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        setIsSuperAdmin(!!data.isSuperAdmin);
        setAuthed(true);
      } catch {
        setAuthed(false);
        router.replace("/login");
      }
    })();
  }, [router]);

  if (authed === null) {
    return (
      <>
        <TopBar />
        <main style={{ padding: 48, fontFamily: F, fontSize: 13, color: colors.textMuted }}>확인 중…</main>
      </>
    );
  }
  if (!authed) return null;

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 96px" }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: colors.accent }}>
          Operator{isSuperAdmin ? " · Admin" : ""}
        </span>
        <h1 style={{ fontFamily: S, fontSize: 30, fontWeight: 300, color: colors.textPrimary, margin: "4px 0 6px" }}>운영자 콘솔</h1>
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, margin: "0 0 24px", lineHeight: 1.6 }}>
          모임 기록 · 피드 모더레이션 · 회원 목록만 가능합니다. 회원 삭제·권한 변경·설정 등은 관리자 전용입니다.
        </p>

        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${colors.border}`, marginBottom: 28 }}>
          {([["gatherings", "모임 기록"], ["moderation", "피드 모더레이션"], ["members", "회원 목록"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: "10px 18px", border: "none", borderBottom: tab === key ? `2px solid ${colors.textPrimary}` : "2px solid transparent", background: "transparent", fontFamily: F, fontSize: 12, fontWeight: tab === key ? 600 : 400, color: tab === key ? colors.textPrimary : colors.textMuted, cursor: "pointer", marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "gatherings" && <GatheringManager onUnauthorized={() => router.replace("/login")} />}
        {tab === "moderation" && <Moderation />}
        {tab === "members" && <Members />}
      </main>
    </>
  );
}

function Moderation() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/moderate-artwork?limit=80", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setPosts(data.posts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "hide" | "unhide" | "delete") {
    if (action === "delete" && !window.confirm("이 게시물을 영구 삭제할까요? 되돌릴 수 없습니다.")) return;
    setBusy(id);
    try {
      const res = await fetch("/api/operator/moderate-artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted }}>불러오는 중…</p>;
  if (posts.length === 0) return <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted }}>피드 게시물이 없습니다.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
      {posts.map((p) => (
        <div key={p.id} style={{ border: `1px solid ${colors.border}`, background: colors.bgCard, opacity: p.isPublic ? 1 : 0.6 }}>
          <div style={{ position: "relative", aspectRatio: "1", background: "#000", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {!p.isPublic && (
              <span style={{ position: "absolute", top: 8, left: 8, background: colors.error, color: "#fff", fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 7px" }}>숨김</span>
            )}
          </div>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ fontFamily: F, fontSize: 12, color: colors.textPrimary, fontWeight: 500 }}>{p.artistName}</div>
            <div style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, margin: "2px 0 10px", lineHeight: 1.5, minHeight: 16, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {p.caption || p.title || "—"}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {p.isPublic ? (
                <button onClick={() => act(p.id, "hide")} disabled={busy === p.id} style={btnStyle(colors.textSecondary)}>숨기기</button>
              ) : (
                <button onClick={() => act(p.id, "unhide")} disabled={busy === p.id} style={btnStyle(colors.success)}>복구</button>
              )}
              <button onClick={() => act(p.id, "delete")} disabled={busy === p.id} style={btnStyle(colors.error)}>삭제</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/operator/members", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setMembers(data.members ?? []);
        setStats(data.stats ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted }}>불러오는 중…</p>;

  const filtered = members.filter((m) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return m.name.toLowerCase().includes(s) || m.location.toLowerCase().includes(s) || m.role.includes(s);
  });

  return (
    <div>
      {stats && (
        <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
          <MStat label="전체" value={stats.total} />
          <MStat label="작가" value={stats.artists} />
          <MStat label="갤러리" value={stats.galleries} />
          <MStat label="큐레이터" value={stats.curators} />
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 / 지역 / 역할 검색"
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${colors.border}`, background: colors.bgCard, fontFamily: F, fontSize: 12, marginBottom: 14, boxSizing: "border-box" }} />
      <div style={{ border: `1px solid ${colors.border}`, background: colors.bgCard }}>
        {filtered.map((m, i) => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 1fr 0.8fr", gap: 8, padding: "10px 14px", borderTop: i === 0 ? "none" : `1px solid ${colors.borderLight}`, fontFamily: F, fontSize: 12, color: colors.textPrimary }}>
            <div>{m.name}</div>
            <div style={{ textTransform: "uppercase", color: colors.textMuted }}>{m.role}</div>
            <div style={{ color: colors.textSecondary }}>{m.location || "-"}</div>
            <div style={{ color: colors.textMuted, textAlign: "right" }}>{new Date(m.joined).toLocaleDateString("ko-KR")}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", fontFamily: F, fontSize: 12, color: colors.textMuted }}>결과 없음</div>}
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return { flex: 1, padding: "6px 8px", border: `1px solid ${colors.border}`, background: "transparent", fontFamily: F, fontSize: 10, letterSpacing: "0.04em", color, cursor: "pointer" };
}

function MStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: S, fontSize: 24, fontWeight: 300, color: colors.textPrimary }}>{value}</div>
      <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.textMuted }}>{label}</div>
    </div>
  );
}
