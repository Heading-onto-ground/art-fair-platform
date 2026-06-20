"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import RitualStrip from "@/app/components/RitualStrip";
import RitualComposerModal, { STATE_LABELS, MEDIUM_LABELS } from "@/app/components/RitualComposerModal";
import { useLanguage } from "@/lib/useLanguage";
import { F, S, colors } from "@/lib/design";
import { artworkTimeAgo } from "@/lib/artworkImageUtils";

type MyMoment = {
  id: string;
  imageUri: string;
  note: string | null;
  state: string;
  medium: string;
  createdAt: string;
};

type Summary = { streak: number; totalMoments: number; postedToday: boolean };

type RitualData = {
  isArtist: boolean;
  summary: Summary | null;
  myMoments: MyMoment[];
};

async function fetchRitualData(): Promise<RitualData> {
  const meRes = await fetch("/api/auth/me?lite=1", { cache: "no-store" });
  const me = await meRes.json().catch(() => null);
  const artist = me?.session?.role === "artist";
  if (!artist) return { isArtist: false, summary: null, myMoments: [] };

  const [ritualRes, mineRes] = await Promise.all([
    fetch("/api/artist/ritual", { cache: "no-store", credentials: "include" }),
    fetch("/api/artist/moments", { cache: "no-store", credentials: "include" }),
  ]);
  const ritual = await ritualRes.json().catch(() => null);
  const mine = await mineRes.json().catch(() => null);
  return {
    isArtist: true,
    summary: ritualRes.ok && ritual ? ritual : null,
    myMoments: mineRes.ok && mine?.moments ? mine.moments : [],
  };
}

export default function ArtistRitualPage() {
  const { lang } = useLanguage();
  const ko = lang === "ko";
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [myMoments, setMyMoments] = useState<MyMoment[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [stripKey, setStripKey] = useState(0);

  const apply = useCallback((data: RitualData) => {
    setIsArtist(data.isArtist);
    setSummary(data.summary);
    setMyMoments(data.myMoments);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRitualData().then((data) => {
      if (!cancelled) apply(data);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const reloadAll = useCallback(() => {
    fetchRitualData().then(apply);
    setStripKey((n) => n + 1);
  }, [apply]);

  const stat = (value: string | number, label: string) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: S, fontSize: 26, fontWeight: 400, color: colors.textPrimary }}>{value}</div>
      <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 100px" }}>
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", color: colors.accent, textTransform: "uppercase" }}>
            {ko ? "작업 리추얼" : "Artist Ritual"}
          </span>
          <h1 style={{ fontFamily: S, fontSize: 34, fontWeight: 300, color: colors.textPrimary, marginTop: 8 }}>
            {ko ? "오늘의 작업" : "Today's practice"}
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, marginTop: 6, lineHeight: 1.6 }}>
            {ko
              ? "매일 작업의 한 순간을 기록하세요. 연속 기록을 이어갈수록 기여 포인트가 쌓입니다."
              : "Capture one moment of your practice each day. Keep your streak to earn contribution points."}
          </p>
        </div>

        {authChecked && !isArtist ? (
          <div style={{ textAlign: "center", padding: "48px 20px", border: `1px solid ${colors.border}`, background: colors.bgAccent }}>
            <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary, margin: "0 0 16px" }}>
              {ko ? "작가로 로그인하면 작업을 기록할 수 있어요." : "Log in as an artist to record your practice."}
            </p>
            <button type="button" onClick={() => router.push("/login?role=artist&redirect=/artist/ritual")} style={{ padding: "10px 24px", border: "none", background: colors.textPrimary, color: colors.bgPrimary, fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
              {ko ? "로그인" : "Log in"}
            </button>
          </div>
        ) : (
          <>
            {isArtist && (
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "20px 0", border: `1px solid ${colors.border}`, background: colors.bgAccent, marginBottom: 20 }}>
                {stat(`🔥 ${summary?.streak ?? 0}`, ko ? "연속" : "Streak")}
                {stat(summary?.totalMoments ?? 0, ko ? "총 기록" : "Total")}
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  style={{ padding: "12px 20px", border: "none", background: summary?.postedToday ? colors.border : colors.accent, color: colors.bgPrimary, fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  {summary?.postedToday ? (ko ? "기록 추가" : "Add more") : ko ? "오늘 기록" : "Record today"}
                </button>
              </div>
            )}

            <h2 style={{ fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textMuted, margin: "8px 0" }}>
              {ko ? "작업 중인 작가들" : "Artists working now"}
            </h2>
            <RitualStrip lang={lang} isArtist={isArtist} refreshKey={stripKey} />

            {isArtist && (
              <>
                <h2 style={{ fontFamily: F, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textMuted, margin: "28px 0 12px" }}>
                  {ko ? "내 기록" : "My records"}
                </h2>
                {myMoments.length === 0 ? (
                  <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted, padding: "24px 0", textAlign: "center" }}>
                    {ko ? "아직 기록이 없어요. 첫 작업을 기록해보세요." : "No records yet. Capture your first practice."}
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                    {myMoments.map((m) => (
                      <div key={m.id} style={{ border: `1px solid ${colors.border}`, background: colors.bgCard }}>
                        <div style={{ aspectRatio: "1", background: "#111" }}>
                          <img src={m.imageUri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <div style={{ fontFamily: F, fontSize: 10, color: colors.accent }}>
                            {STATE_LABELS[m.state] ? (ko ? STATE_LABELS[m.state].ko : STATE_LABELS[m.state].en) : m.state}
                            {" · "}
                            {MEDIUM_LABELS[m.medium] ? (ko ? MEDIUM_LABELS[m.medium].ko : MEDIUM_LABELS[m.medium].en) : m.medium}
                          </div>
                          {m.note && <p style={{ fontFamily: F, fontSize: 11, color: colors.textSecondary, margin: "4px 0 0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.note}</p>}
                          <div style={{ fontFamily: F, fontSize: 9, color: colors.textLight, marginTop: 4 }}>{artworkTimeAgo(m.createdAt, lang)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <RitualComposerModal lang={lang} open={composerOpen} onClose={() => setComposerOpen(false)} onPosted={reloadAll} />
    </>
  );
}
