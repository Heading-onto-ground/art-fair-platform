"use client";

import { useCallback, useEffect, useState } from "react";
import { F, colors } from "@/lib/design";
import { artworkTimeAgo } from "@/lib/artworkImageUtils";
import { STATE_LABELS, MEDIUM_LABELS } from "@/app/components/RitualComposerModal";

type Moment = {
  id: string;
  artistId: string;
  artistName: string;
  imageUri: string;
  note: string | null;
  state: string;
  medium: string;
  createdAt: string;
  reactions: Record<string, number>;
  myReaction: string | null;
};

type RitualSummary = { streak: number; totalMoments: number; postedToday: boolean };

type Props = {
  lang: string;
  isArtist: boolean;
  onViewPractice?: () => void;
  refreshKey?: number;
};

const REACTIONS: { type: string; emoji: string }[] = [
  { type: "fire", emoji: "🔥" },
  { type: "mind_blown", emoji: "🤯" },
  { type: "eyes", emoji: "👀" },
  { type: "brain", emoji: "🧠" },
];

function stateLabel(s: string, ko: boolean) {
  return STATE_LABELS[s] ? (ko ? STATE_LABELS[s].ko : STATE_LABELS[s].en) : s;
}
function mediumLabel(m: string, ko: boolean) {
  return MEDIUM_LABELS[m] ? (ko ? MEDIUM_LABELS[m].ko : MEDIUM_LABELS[m].en) : m;
}

export default function RitualStrip({ lang, isArtist, onViewPractice, refreshKey }: Props) {
  const ko = lang === "ko";
  const [moments, setMoments] = useState<Moment[]>([]);
  const [summary, setSummary] = useState<RitualSummary | null>(null);
  const [viewer, setViewer] = useState<Moment | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const reqs: Promise<Response>[] = [
        fetch("/api/artist/moments?recent=true", { cache: "no-store" }),
      ];
      if (isArtist) reqs.push(fetch("/api/artist/ritual", { cache: "no-store", credentials: "include" }));
      const [recentRes, ritualRes] = await Promise.all(reqs);
      const recentData = await recentRes.json().catch(() => null);
      if (recentRes.ok && recentData?.moments) setMoments(recentData.moments);
      if (ritualRes) {
        const r = await ritualRes.json().catch(() => null);
        if (ritualRes.ok && r) setSummary(r);
      }
    } catch {
      /* non-blocking */
    }
  }, [isArtist]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function react(moment: Moment, type: string) {
    if (acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/artist/moments/${moment.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reactionType: type }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        const updated: Moment = {
          ...moment,
          reactions: data.reactions || {},
          myReaction: data.reactionType ?? null,
        };
        setViewer(updated);
        setMoments((prev) => prev.map((m) => (m.id === moment.id ? updated : m)));
      }
    } finally {
      setActing(false);
    }
  }

  const showStrip = isArtist || moments.length > 0;
  if (!showStrip) return null;

  return (
    <div style={{ borderBottom: `1px solid ${colors.border}`, padding: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 8px" }}>
        <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.textMuted }}>
          {ko ? "지금 작업 중" : "Working now"}
        </span>
        {isArtist && onViewPractice && (
          <button
            type="button"
            onClick={onViewPractice}
            style={{ border: "none", background: "none", fontFamily: F, fontSize: 10, color: colors.accent, cursor: "pointer", padding: 0 }}
          >
            {ko ? "내 작업 기록 →" : "My practice logs →"}
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "0 4px", scrollbarWidth: "none" }}>
        {moments.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setViewer(m)}
            style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, border: "none", background: "none", cursor: "pointer", width: 64 }}
          >
            <span style={{ width: 60, height: 60, borderRadius: "50%", overflow: "hidden", border: `2px solid ${colors.accent}`, display: "block" }}>
              <img src={m.imageUri} alt={m.artistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </span>
            <span style={{ fontFamily: F, fontSize: 10, color: colors.textSecondary, textAlign: "center", lineHeight: 1.2, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.artistName}
            </span>
          </button>
        ))}

        {isArtist && moments.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", fontFamily: F, fontSize: 11, color: colors.textMuted, paddingLeft: 4 }}>
            {ko ? "지금 작업 중인 작가가 없어요. + 버튼으로 첫 기록을 남겨보세요." : "No one working right now. Tap + to record your first practice log."}
          </div>
        )}
        {isArtist && summary && summary.streak > 0 && (
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", paddingRight: 8 }}>
            <span style={{ fontFamily: F, fontSize: 11, color: colors.accent, whiteSpace: "nowrap" }}>🔥 {summary.streak}{ko ? "일 연속" : " day streak"}</span>
          </div>
        )}
      </div>

      {viewer && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 2050, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setViewer(null)}
        >
          <div style={{ width: "100%", maxWidth: 420, background: colors.bgCard, borderRadius: 8, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${colors.borderLight}` }}>
              <div>
                <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{viewer.artistName}</div>
                <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>
                  {stateLabel(viewer.state, ko)} · {mediumLabel(viewer.medium, ko)} · {artworkTimeAgo(viewer.createdAt, lang)}
                </div>
              </div>
              <button type="button" onClick={() => setViewer(null)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: colors.textMuted }}>×</button>
            </div>
            <div style={{ background: "#000", maxHeight: "60vh", display: "flex", justifyContent: "center" }}>
              <img src={viewer.imageUri} alt="" style={{ width: "100%", objectFit: "contain", maxHeight: "60vh" }} />
            </div>
            <div style={{ padding: "14px 16px" }}>
              {viewer.note && (
                <p style={{ fontFamily: F, fontSize: 13, color: colors.textPrimary, margin: "0 0 12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{viewer.note}</p>
              )}
              {isArtist ? (
                <div style={{ display: "flex", gap: 8 }}>
                  {REACTIONS.map((r) => {
                    const active = viewer.myReaction === r.type;
                    const count = viewer.reactions?.[r.type] || 0;
                    return (
                      <button
                        key={r.type}
                        type="button"
                        disabled={acting}
                        onClick={() => react(viewer, r.type)}
                        style={{ flex: 1, padding: "8px 0", border: `1px solid ${active ? colors.accent : colors.border}`, background: active ? "rgba(139,115,85,0.08)" : "transparent", borderRadius: 999, cursor: acting ? "wait" : "pointer", fontFamily: F, fontSize: 14 }}
                      >
                        {r.emoji}{count > 0 && <span style={{ fontSize: 11, marginLeft: 4, color: colors.textMuted }}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, margin: 0 }}>
                  {ko ? "작가로 로그인하면 반응을 남길 수 있어요." : "Log in as an artist to react."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
