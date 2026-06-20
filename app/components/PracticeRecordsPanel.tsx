"use client";

import { useCallback, useEffect, useState } from "react";
import { F, S, colors } from "@/lib/design";
import { artworkTimeAgo } from "@/lib/artworkImageUtils";
import { STATE_LABELS, MEDIUM_LABELS } from "@/app/components/RitualComposerModal";

type MyMoment = {
  id: string;
  imageUri: string;
  note: string | null;
  state: string;
  medium: string;
  createdAt: string;
};

type Summary = { streak: number; totalMoments: number; postedToday: boolean };

type Props = {
  lang: string;
  refreshKey?: number;
  onRecord: () => void;
};

function label(map: Record<string, { ko: string; en: string }>, key: string, ko: boolean) {
  return map[key] ? (ko ? map[key].ko : map[key].en) : key;
}

export default function PracticeRecordsPanel({ lang, refreshKey, onRecord }: Props) {
  const ko = lang === "ko";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [moments, setMoments] = useState<MyMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<MyMoment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ritualRes, mineRes] = await Promise.all([
        fetch("/api/artist/ritual", { cache: "no-store", credentials: "include" }),
        fetch("/api/artist/moments", { cache: "no-store", credentials: "include" }),
      ]);
      const ritual = await ritualRes.json().catch(() => null);
      const mine = await mineRes.json().catch(() => null);
      if (ritualRes.ok && ritual) setSummary(ritual);
      if (mineRes.ok && mine?.moments) setMoments(mine.moments);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div>
      <div style={{ padding: "16px 4px", borderBottom: `1px solid ${colors.border}`, background: colors.bgAccent }}>
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, margin: "0 0 12px", lineHeight: 1.65 }}>
          {ko
            ? "작업 과정 기록은 피드에 반영되지 않습니다. 매일 작업하는 순간을 모아두는 공간이에요."
            : "Practice logs stay off the main feed. This is your daily working journal."}
        </p>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", marginBottom: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: S, fontSize: 24, color: colors.textPrimary }}>🔥 {summary?.streak ?? 0}</div>
            <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>{ko ? "연속" : "Streak"}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: S, fontSize: 24, color: colors.textPrimary }}>{summary?.totalMoments ?? 0}</div>
            <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>{ko ? "총 기록" : "Total"}</div>
          </div>
          <button
            type="button"
            onClick={onRecord}
            style={{ padding: "10px 18px", border: "none", background: summary?.postedToday ? colors.border : colors.accent, color: colors.bgPrimary, fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", cursor: "pointer" }}
          >
            {summary?.postedToday ? (ko ? "추가 기록" : "Add log") : ko ? "오늘 기록" : "Record today"}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, textAlign: "center", padding: "48px 0" }}>{ko ? "불러오는 중…" : "Loading…"}</p>
      ) : moments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted, margin: "0 0 16px", lineHeight: 1.6 }}>
            {ko ? "아직 작업 과정 기록이 없어요." : "No practice logs yet."}
          </p>
          <button type="button" onClick={onRecord} style={{ padding: "10px 24px", border: "none", background: colors.textPrimary, color: colors.bgPrimary, fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
            {ko ? "첫 기록 남기기" : "Record first log"}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, padding: "12px 4px" }}>
          {moments.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setViewer(m)}
              style={{ border: `1px solid ${colors.border}`, background: colors.bgCard, padding: 0, cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ aspectRatio: "1", background: "#111" }}>
                <img src={m.imageUri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div style={{ fontFamily: F, fontSize: 10, color: colors.accent }}>
                  {label(STATE_LABELS, m.state, ko)} · {label(MEDIUM_LABELS, m.medium, ko)}
                </div>
                {m.note && (
                  <p style={{ fontFamily: F, fontSize: 11, color: colors.textSecondary, margin: "4px 0 0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {m.note}
                  </p>
                )}
                <div style={{ fontFamily: F, fontSize: 9, color: colors.textLight, marginTop: 4 }}>{artworkTimeAgo(m.createdAt, lang)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {viewer && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 2050, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setViewer(null)}
        >
          <div style={{ width: "100%", maxWidth: 420, background: colors.bgCard, borderRadius: 8, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${colors.borderLight}` }}>
              <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>
                {label(STATE_LABELS, viewer.state, ko)} · {label(MEDIUM_LABELS, viewer.medium, ko)} · {artworkTimeAgo(viewer.createdAt, lang)}
              </div>
              <button type="button" onClick={() => setViewer(null)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: colors.textMuted }}>×</button>
            </div>
            <div style={{ background: "#000", maxHeight: "60vh" }}>
              <img src={viewer.imageUri} alt="" style={{ width: "100%", objectFit: "contain", maxHeight: "60vh", display: "block" }} />
            </div>
            {viewer.note && (
              <p style={{ fontFamily: F, fontSize: 13, color: colors.textPrimary, margin: 0, padding: "14px 16px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{viewer.note}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
