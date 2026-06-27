"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { F, S, colors } from "@/lib/design";

type SearchArtist = { id: string; artistId: string; name: string; country?: string | null; city?: string | null; genre?: string | null };
type Attendee = { id: string; artistId: string; name: string };
type Recap = { attendeeCount: number; totalPairs: number; newConnections: number; returningPairs: number; skipped: number };
type GatheringRow = {
  id: string;
  title: string;
  theme: string | null;
  location: string | null;
  happenedAt: string;
  attendeeCount: number;
  attendees: { artistId: string; name: string; publicId: string | null }[];
};

function todayInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Self-contained gathering check-in tool. Reused by admin and operator consoles. */
export default function GatheringManager({ onUnauthorized }: { onUnauthorized?: () => void }) {
  const [ready, setReady] = useState(false);
  const [gatherings, setGatherings] = useState<GatheringRow[]>([]);

  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Attendee[]>([]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchArtist[]>([]);
  const [searching, setSearching] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [recap, setRecap] = useState<(Recap & { title: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGatherings = useCallback(async () => {
    const res = await fetch("/api/admin/gatherings");
    if (res.status === 401) {
      onUnauthorized?.();
      return;
    }
    setReady(true);
    const data = await res.json().catch(() => ({}));
    setGatherings(data.gatherings ?? []);
  }, [onUnauthorized]);

  useEffect(() => { loadGatherings(); }, [loadGatherings]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists/search?q=${encodeURIComponent(query.trim())}&limit=12`);
        const data = await res.json().catch(() => ({}));
        setResults(data.artists ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  function addAttendee(a: SearchArtist) {
    if (selected.some((s) => s.id === a.id)) return;
    setSelected((prev) => [...prev, { id: a.id, artistId: a.artistId, name: a.name }]);
    setQuery("");
    setResults([]);
  }

  function removeAttendee(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }

  async function submit() {
    setError(null);
    if (!title.trim()) {
      setError("회차 제목을 입력하세요 (예: A모임 #7)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/gatherings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          theme: theme.trim() || null,
          location: location.trim() || null,
          note: note.trim() || null,
          happenedAt: date ? new Date(`${date}T12:00:00`).toISOString() : undefined,
          artistIds: selected.map((s) => s.id),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      setRecap({ ...data.recap, title: data.gathering.title });
      setTitle("");
      setTheme("");
      setLocation("");
      setNote("");
      setSelected([]);
      setDate(todayInput());
      await loadGatherings();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: `1px solid ${colors.border}`, background: colors.bgCard,
    fontFamily: F, fontSize: 13, color: colors.textPrimary, boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: F, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
    color: colors.textMuted, margin: "0 0 6px",
  };

  if (!ready) {
    return <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted }}>불러오는 중…</p>;
  }

  return (
    <div>
      <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary, lineHeight: 1.7, margin: "0 0 24px" }}>
        모임 한 번을 기록하면 참석자들 사이에 <strong>공동현존 연결</strong>이 자동으로 생깁니다. 끝나기 직전 30초, 오늘 온 사람만 탭하세요.{" "}
        <Link href="/network?view=graph" style={{ color: colors.accent }}>네트워크 그래프 보기 →</Link>
      </p>

      {recap && (
        <div style={{ border: `1px solid ${colors.accent}`, background: colors.accentSoft, padding: 20, marginBottom: 28 }}>
          <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.accent, marginBottom: 8 }}>회차 리캡 · {recap.title}</div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <Stat label="참석" value={recap.attendeeCount} />
            <Stat label="새 연결" value={recap.newConnections} highlight />
            <Stat label="재회 연결" value={recap.returningPairs} />
            <Stat label="총 연결쌍" value={recap.totalPairs} />
          </div>
          {recap.skipped > 0 && (
            <p style={{ fontFamily: F, fontSize: 11, color: colors.warning, margin: "10px 0 0" }}>
              {recap.skipped}명은 플랫폼에 가입된 작가 프로필이 없어 제외됐어요.
            </p>
          )}
          <button onClick={() => setRecap(null)} style={{ marginTop: 12, padding: "6px 14px", border: `1px solid ${colors.border}`, background: "transparent", fontFamily: F, fontSize: 11, cursor: "pointer", color: colors.textSecondary }}>닫기</button>
        </div>
      )}

      <div style={{ border: `1px solid ${colors.border}`, background: colors.bgCard, padding: 24, marginBottom: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>회차 제목 *</label>
            <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A모임 #7" />
          </div>
          <div>
            <label style={labelStyle}>날짜</label>
            <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>오늘 주제</label>
            <input style={inputStyle} value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="기억" />
          </div>
          <div>
            <label style={labelStyle}>장소</label>
            <input style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="홍대" />
          </div>
        </div>

        <label style={labelStyle}>참석자 체크인</label>
        <div style={{ position: "relative" }}>
          <input style={inputStyle} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="작가 이름 또는 ID 검색 (2글자 이상)" />
          {(results.length > 0 || (query.trim().length >= 2 && !searching)) && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: colors.bgCard, border: `1px solid ${colors.border}`, borderTop: "none", maxHeight: 260, overflowY: "auto" }}>
              {results.length === 0 ? (
                <div style={{ padding: "10px 12px", fontFamily: F, fontSize: 12, color: colors.textMuted }}>검색 결과 없음</div>
              ) : results.map((a) => {
                const already = selected.some((s) => s.id === a.id);
                return (
                  <button key={a.id} onClick={() => addAttendee(a)} disabled={already}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: `1px solid ${colors.borderLight}`, background: already ? colors.bgSecondary : "transparent", cursor: already ? "default" : "pointer", fontFamily: F }}>
                    <span style={{ fontSize: 13, color: colors.textPrimary }}>{a.name}</span>
                    <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 8 }}>{[a.genre, a.city || a.country].filter(Boolean).join(" · ")}</span>
                    {already && <span style={{ fontSize: 11, color: colors.accent, marginLeft: 8 }}>추가됨</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {selected.map((s) => (
              <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 6px 5px 12px", background: colors.bgSecondary, border: `1px solid ${colors.border}`, fontFamily: F, fontSize: 12, color: colors.textPrimary }}>
                {s.name}
                <button onClick={() => removeAttendee(s.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: colors.textMuted, fontSize: 14, lineHeight: 1, padding: "0 4px" }}>×</button>
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>메모 (선택)</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="오늘 나온 책, 협업 이야기 등" />
        </div>

        {error && <p style={{ fontFamily: F, fontSize: 12, color: colors.error, margin: "14px 0 0" }}>{error}</p>}

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20 }}>
          <button onClick={submit} disabled={submitting}
            style={{ padding: "12px 28px", border: "none", background: submitting ? colors.border : colors.textPrimary, color: colors.bgPrimary, fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: submitting ? "wait" : "pointer" }}>
            {submitting ? "기록 중…" : "회차 기록하기"}
          </button>
          <span style={{ fontFamily: F, fontSize: 12, color: colors.textMuted }}>참석자 {selected.length}명</span>
        </div>
      </div>

      <h2 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: colors.textPrimary, margin: "0 0 16px" }}>지난 회차</h2>
      {gatherings.length === 0 ? (
        <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted }}>아직 기록된 회차가 없습니다. 첫 회차를 기록해 보세요.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {gatherings.map((g) => (
            <div key={g.id} style={{ border: `1px solid ${colors.border}`, background: colors.bgCard, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div style={{ fontFamily: S, fontSize: 17, color: colors.textPrimary }}>{g.title}</div>
                <div style={{ fontFamily: F, fontSize: 11, color: colors.textMuted }}>
                  {new Date(g.happenedAt).toLocaleDateString("ko-KR")} · {g.attendeeCount}명
                </div>
              </div>
              {(g.theme || g.location) && (
                <div style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                  {[g.theme && `주제 ${g.theme}`, g.location].filter(Boolean).join(" · ")}
                </div>
              )}
              {g.attendees.length > 0 && (
                <div style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 1.6 }}>
                  {g.attendees.map((a) => a.name).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: S, fontSize: 28, fontWeight: 300, color: highlight ? colors.accent : colors.textPrimary }}>{value}</div>
      <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.textMuted }}>{label}</div>
    </div>
  );
}
