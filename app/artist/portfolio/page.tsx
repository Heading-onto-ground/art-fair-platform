"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type Profile = {
  id: string;
  artistId: string;
  name: string;
  genre: string;
  country: string;
  city: string;
  bio?: string | null;
  workNote?: string | null;
  profileImage?: string | null;
  instagram?: string | null;
  website?: string | null;
  startedYear?: number | null;
  artisticId?: string;
  exhibitions_public?: boolean;
};

type SeriesItem = {
  id: string;
  title: string;
  description?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  works?: string | null;
  isPublic: boolean;
};

type Exhibition = {
  galleryName: string;
  theme: string;
  country: string;
  city: string;
  acceptedAt: string;
};

type ArtEvent = {
  id: string;
  eventType: string;
  title: string;
  year: number;
  description?: string | null;
  isPublic: boolean;
};

const EVENT_LABEL: Record<string, string> = {
  exhibition: "Exhibition",
  collaboration: "Collaboration",
  publication: "Publication",
  series_start: "Series",
  residency: "Residency",
  award: "Award",
  grant: "Grant",
  opencall_result: "Open Call",
  press: "Press",
};

const EVENT_COLOR: Record<string, string> = {
  exhibition: "#8B7355",
  collaboration: "#5A7A5A",
  publication: "#5A5A8B",
  series_start: "#8B5A5A",
  residency: "#4A7A8B",
  award: "#8B7A2A",
  grant: "#2A7A5A",
  opencall_result: "#7A4A8B",
  press: "#6A6A6A",
};

export default function ArtistPortfolioPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [artEvents, setArtEvents] = useState<ArtEvent[]>([]);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);

  const tr = (ko: string, en: string) => lang === "ko" ? ko : en;

  const EditBtn = ({ section }: { section: string }) => (
    <button
      onClick={() => router.push(`/artist/me#${section}`)}
      style={{ padding: "6px 12px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1A1A1A"; e.currentTarget.style.color = "#1A1A1A"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; e.currentTarget.style.color = "#8A8580"; }}
    >
      {tr("수정", "Edit")}
    </button>
  );

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const me = await meRes.json().catch(() => null);
      if (!me?.session) { router.replace("/login?role=artist"); return; }
      if (me.session.role !== "artist") { router.replace("/gallery"); return; }

      setProfile(me.profile ?? null);

      const [seriesRes, exRes, evRes] = await Promise.all([
        fetch("/api/artist/series", { credentials: "include" }),
        fetch("/api/artist/exhibitions", { credentials: "include" }),
        fetch("/api/artist/art-events", { credentials: "include" }),
      ]);
      const [seriesData, exData, evData] = await Promise.all([
        seriesRes.json().catch(() => null),
        exRes.json().catch(() => null),
        evRes.json().catch(() => null),
      ]);

      if (seriesData?.series) setSeries(seriesData.series);
      if (exData?.exhibitions) setExhibitions(exData.exhibitions);
      if (evData?.artEvents) setArtEvents(evData.artEvents);
      if (exData?.artistId) setArtistId(exData.artistId);

      setLoading(false);
    })();
  }, [router]);

  const publicSeries = series.filter((s) => s.isPublic);
  const categories = ["ALL", ...series.map((s) => s.title)];
  const filteredSeries = activeCategory === "ALL" ? series : series.filter((s) => s.title === activeCategory);

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "80px 40px" }}>
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 80, background: "#F5F1EB", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        </main>
        <style jsx global>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </>
    );
  }

  const yearsActive = profile?.startedYear
    ? new Date().getFullYear() - profile.startedYear
    : null;

  return (
    <>
      <TopBar />
      <style jsx global>{`
        @media (max-width: 768px) {
          .portfolio-layout { padding: 32px 20px !important; }
          .profile-header { flex-direction: column !important; gap: 24px !important; }
          .profile-image { width: 80px !important; height: 80px !important; }
          .category-tabs { gap: 6px !important; }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <main className="portfolio-layout" style={{ maxWidth: 900, margin: "0 auto", padding: "56px 40px" }}>

        {/* ── Profile Header ── */}
        <div className="profile-header" style={{ display: "flex", gap: 36, alignItems: "flex-start", marginBottom: 48, paddingBottom: 40, borderBottom: "1px solid #E8E3DB" }}>
          {/* Avatar */}
          <div className="profile-image" style={{ width: 96, height: 96, border: "1px solid #E8E3DB", background: "#F5F1EB", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {profile?.profileImage
              ? <img src={profile.profileImage} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#C8BFB4" }}>{profile?.name?.charAt(0)?.toUpperCase() || "A"}</span>
            }
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", marginBottom: 8 }}>
              {tr("내 포트폴리오", "My Portfolio")}
            </div>
            <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 300, color: "#1A1A1A", margin: "0 0 8px", letterSpacing: "0.01em" }}>
              {profile?.name || "—"}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" }}>
              {profile?.genre && (
                <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FDFBF7", background: "#8B7355", padding: "4px 10px" }}>
                  {profile.genre}
                </span>
              )}
              {(profile?.city || profile?.country) && (
                <span style={{ fontFamily: F, fontSize: 11, color: "#8A8580" }}>
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </span>
              )}
              {yearsActive !== null && yearsActive > 0 && (
                <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
                  {yearsActive}{tr("년 활동", "yr active")}
                </span>
              )}
            </div>

            {/* Social links */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              {profile?.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"
                  style={{ fontFamily: F, fontSize: 10, color: "#8B7355", textDecoration: "underline", textUnderlineOffset: 2 }}>
                  {profile.instagram.startsWith("@") ? profile.instagram : `@${profile.instagram}`}
                </a>
              )}
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noreferrer"
                  style={{ fontFamily: F, fontSize: 10, color: "#8B7355", textDecoration: "underline", textUnderlineOffset: 2 }}>
                  {profile.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => router.push("/artist/me")}
                style={{ padding: "10px 24px", border: "none", background: "#8B7355", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#6B5340"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#8B7355"; }}
              >
                {tr("마이페이지", "My Page")}
              </button>
              <button
                onClick={() => router.push("/exhibitions/new")}
                style={{ padding: "10px 24px", border: "none", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#8B7355"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1A1A1A"; }}
              >
                + {tr("전시 기록 추가", "Add Exhibition")}
              </button>
              <button
                onClick={() => router.push("/artist/me#profile_edit")}
                style={{ padding: "9px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#4A4A4A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1A1A1A"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; }}
              >
                {tr("프로필 편집", "Edit Profile")}
              </button>
              {artistId && (
                <button
                  onClick={() => router.push(`/artist/public/${encodeURIComponent(artistId)}`)}
                  style={{ padding: "9px 20px", border: "1px solid #D4C9B8", background: "transparent", color: "#8B7355", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {tr("공개 포트폴리오 →", "Public Portfolio →")}
                </button>
              )}
              <button
                onClick={() => router.push("/artist")}
                style={{ padding: "9px 20px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#3A3A3A"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1A1A1A"; }}
              >
                {tr("공모 탐색", "Open Calls")}
              </button>
            </div>

            {/* ── Share Section ── */}
            {artistId && (
              <div style={{ marginTop: 16, padding: "14px 16px", background: "#F5F1EB", border: "1px solid #E8E3DB" }}>
                <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B0AAA2", margin: "0 0 8px" }}>
                  {tr("공개 포트폴리오 링크", "Public Portfolio Link")}
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <code style={{ fontFamily: F, fontSize: 11, color: "#4A4540", background: "#FFFFFF", padding: "6px 10px", border: "1px solid #E8E3DB", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    rob-roleofbridge.com/artist/public/{artistId}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://rob-roleofbridge.com/artist/public/${artistId}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    style={{ padding: "7px 14px", border: "1px solid #E8E3DB", background: copied ? "#1A1A1A" : "transparent", color: copied ? "#FDFBF7" : "#4A4540", fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
                  >
                    {copied ? tr("복사됨 ✓", "Copied ✓") : tr("링크 복사", "Copy Link")}
                  </button>
                </div>
                <p style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", margin: "8px 0 0", lineHeight: 1.6 }}>
                  {tr("인스타그램 bio에 추가하면 갤러리와 큐레이터가 찾아올 수 있어요.", "Add this to your Instagram bio so galleries and curators can find you.")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Profile Completion Bar ── */}
        {(() => {
          const score = [
            profile?.bio ? 20 : 0,
            profile?.workNote ? 15 : 0,
            profile?.profileImage ? 15 : 0,
            (profile?.country || profile?.city) ? 10 : 0,
            artEvents.length > 0 ? 30 : 0,
            series.length > 0 ? 10 : 0,
          ].reduce((a, b) => a + b, 0);
          if (score >= 100) return null;
          const missing = [
            !profile?.bio && tr("아티스트 소개", "Bio"),
            !profile?.workNote && tr("작업 노트", "Work Note"),
            !profile?.profileImage && tr("프로필 사진", "Profile Image"),
            !(profile?.country || profile?.city) && tr("국가/도시", "Location"),
            artEvents.length === 0 && tr("활동 1개", "1 Activity"),
            series.length === 0 && tr("시리즈 1개", "1 Series"),
          ].filter(Boolean);
          return (
            <div style={{ marginBottom: 28, padding: "16px 20px", background: "#FAF8F4", border: "1px solid #E8E3DB" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8B7355", margin: 0 }}>
                  {tr("프로필 완성도", "Profile Completion")}
                </p>
                <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>{score}%</span>
              </div>
              <div style={{ height: 4, background: "#E8E3DB", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ height: "100%", width: `${score}%`, background: "#8B7355", borderRadius: 2, transition: "width 0.5s ease" }} />
              </div>
              <p style={{ fontFamily: F, fontSize: 10, color: "#8A8580", margin: 0 }}>
                {tr("추가하면 완성도가 올라가요: ", "Add to improve: ")}
                {missing.slice(0, 3).join(" · ")}
                {missing.length > 3 && ` +${missing.length - 3}`}
              </p>
            </div>
          );
        })()}

        {/* ── Welcome Banner (신규 사용자 / 데이터 없음) ── */}
        {series.length === 0 && exhibitions.length === 0 && artEvents.length === 0 && (
          <div style={{ marginBottom: 40, padding: "32px 36px", background: "#FAF8F4", border: "1px solid #E8E3DB" }}>
            <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355", margin: "0 0 12px" }}>
              {tr("시작하기", "GET STARTED")}
            </p>
            <p style={{ fontFamily: S, fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 300, color: "#1A1A1A", margin: "0 0 8px" }}>
              {tr("첫 번째 활동을 기록해보세요", "Record your first activity")}
            </p>
            <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", margin: "0 0 24px", lineHeight: 1.7 }}>
              {tr(
                "전시, 레지던시, 수상 등 활동을 기록하면 공개 포트폴리오가 완성됩니다.",
                "Add your exhibitions, residencies, and awards to build your public portfolio."
              )}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => router.push("/artist/me#art_events")}
                style={{ padding: "12px 28px", border: "none", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#8B7355"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1A1A1A"; }}
              >
                + {tr("활동 추가하기", "Add Activity")}
              </button>
              <button
                onClick={() => router.push("/exhibitions/new")}
                style={{ padding: "11px 24px", border: "1px solid #1A1A1A", background: "transparent", color: "#1A1A1A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F1EB"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                + {tr("전시 기록 추가", "Add Exhibition")}
              </button>
            </div>
          </div>
        )}

        {/* ── Bio / Work Note ── */}
        <div style={{ marginBottom: 48, display: "grid", gap: 16 }}>
          {profile?.bio ? (
              <div style={{ padding: "20px 24px", border: "1px solid #E8E3DB", background: "#FDFBF7", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B0AAA2", margin: 0 }}>
                    {tr("아티스트 소개", "About")}
                  </p>
                  <EditBtn section="profile_edit" />
                </div>
                <p style={{ fontFamily: F, fontSize: 13, color: "#4A4540", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{profile.bio}</p>
              </div>
          ) : (
              <div style={{ padding: "20px 24px", border: "1px dashed #E8E3DB", background: "#FAF8F4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B0AAA2", margin: 0 }}>
                    {tr("아티스트 소개", "About")}
                  </p>
                  <EditBtn section="profile_edit" />
                </div>
                <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", margin: 0 }}>{tr("프로필에서 소개를 작성해주세요.", "Add your bio in Profile.")}</p>
              </div>
          )}
          {profile?.workNote ? (
              <div style={{ padding: "20px 24px", border: "1px solid #E8E3DB", background: "#FDFBF7", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8B7355", margin: 0 }}>
                    Work Note
                  </p>
                  <EditBtn section="work_note" />
                </div>
                <p style={{ fontFamily: F, fontSize: 13, color: "#4A4540", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{profile.workNote}</p>
              </div>
          ) : (
              <div style={{ padding: "20px 24px", border: "1px dashed #E8E3DB", background: "#FAF8F4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8B7355", margin: 0 }}>
                    Work Note
                  </p>
                  <EditBtn section="work_note" />
                </div>
                <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", margin: 0 }}>{tr("프로필에서 작업 노트를 작성해주세요.", "Add your work note in Profile.")}</p>
              </div>
          )}
        </div>

        {/* ── Series (카테고리별) ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
                {tr("시리즈 작업", "Artwork Series")}
              </span>
              <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", marginLeft: 10 }}>
                {series.length} {tr("개", "series")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <EditBtn section="series" />
              <button
                onClick={() => router.push("/artist/me#series")}
                style={{ padding: "7px 14px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#1A1A1A"; e.currentTarget.style.borderColor = "#1A1A1A"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8A8580"; e.currentTarget.style.borderColor = "#E8E3DB"; }}
              >
                + {tr("시리즈 추가", "Add Series")}
              </button>
            </div>
          </div>

          {/* Category tabs */}
          {series.length > 1 && (
            <div className="category-tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "8px 16px",
                    border: cat === activeCategory ? "1px solid #1A1A1A" : "1px solid #E8E3DB",
                    background: cat === activeCategory ? "#1A1A1A" : "transparent",
                    color: cat === activeCategory ? "#FDFBF7" : "#4A4A4A",
                    fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em",
                    textTransform: cat === "ALL" ? "uppercase" : "none",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {cat === "ALL" ? tr("전체", "ALL") : cat}
                </button>
              ))}
            </div>
          )}

          {series.length === 0 ? (
            <div style={{ padding: "48px 32px", border: "1px dashed #D4CEC4", textAlign: "center" }}>
              <p style={{ fontFamily: S, fontSize: 16, fontStyle: "italic", color: "#B0AAA2", marginBottom: 16 }}>
                {tr("아직 등록된 시리즈가 없습니다", "No series yet")}
              </p>
              <button
                onClick={() => router.push("/artist/me#series")}
                style={{ padding: "10px 24px", border: "1px solid #1A1A1A", background: "transparent", color: "#1A1A1A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
              >
                + {tr("첫 번째 시리즈 추가", "Add First Series")}
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
              {filteredSeries.map((s, idx) => (
                <SeriesCard key={s.id} series={s} index={idx} lang={lang} />
              ))}
            </div>
          )}
        </div>

        {/* ── Gallery Exhibitions ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
              {tr("전시 이력", "Exhibition History")}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{exhibitions.length}</span>
              <EditBtn section="exhibitions" />
            </div>
          </div>
          {exhibitions.length === 0 ? (
            <div style={{ padding: "40px 32px", border: "1px dashed #D4CEC4", textAlign: "center" }}>
              <p style={{ fontFamily: S, fontSize: 16, fontStyle: "italic", color: "#B0AAA2", margin: "0 0 8px" }}>
                {tr("아직 갤러리 전시 이력이 없습니다", "No gallery exhibitions yet")}
              </p>
              <p style={{ fontFamily: F, fontSize: 11, color: "#C0B8B0", margin: "0 0 20px", lineHeight: 1.7 }}>
                {tr("오픈콜에 지원해서 합격하면 자동으로 표시됩니다.", "Apply to open calls — accepted exhibitions appear here automatically.")}
              </p>
              <button
                onClick={() => router.push("/artist")}
                style={{ padding: "10px 24px", border: "1px solid #1A1A1A", background: "transparent", color: "#1A1A1A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F1EB"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {tr("오픈콜 탐색", "Browse Open Calls")}
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
              {exhibitions.map((ex, i) => (
                <div key={i} style={{ background: "#FFFFFF", padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>
                        {[ex.country, ex.city].filter(Boolean).join(" / ")}
                      </span>
                      <h3 style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", margin: "4px 0 2px" }}>{ex.galleryName}</h3>
                      <p style={{ fontFamily: F, fontSize: 12, color: "#6A6660", margin: 0 }}>{ex.theme}</p>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <span style={{ fontFamily: S, fontSize: 13, color: "#1A1A1A" }}>
                        {ex.acceptedAt ? new Date(ex.acceptedAt).getFullYear() : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Activity Timeline ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
              {tr("활동 타임라인", "Activity Timeline")}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{artEvents.length}</span>
              <EditBtn section="art_events" />
              <button
                onClick={() => router.push("/artist/me#art_events")}
                style={{ padding: "7px 14px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#1A1A1A"; e.currentTarget.style.borderColor = "#1A1A1A"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8A8580"; e.currentTarget.style.borderColor = "#E8E3DB"; }}
              >
                + {tr("추가", "Add")}
              </button>
            </div>
          </div>
          {artEvents.length === 0 ? (
            <div style={{ padding: "48px 32px", border: "1px dashed #D4CEC4", textAlign: "center" }}>
              <p style={{ fontFamily: S, fontSize: 16, fontStyle: "italic", color: "#B0AAA2", marginBottom: 16 }}>
                {tr("아직 등록된 활동이 없습니다", "No activities yet")}
              </p>
              <button
                onClick={() => router.push("/artist/me#art_events")}
                style={{ padding: "10px 24px", border: "1px solid #1A1A1A", background: "transparent", color: "#1A1A1A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F1EB"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                + {tr("첫 번째 활동 추가", "Add First Activity")}
              </button>
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 24 }}>
              <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 1, background: "#E8E3DB" }} />
              {artEvents.map((ev) => (
                <div key={ev.id} style={{ position: "relative", marginBottom: 20, paddingLeft: 20 }}>
                  <div style={{ position: "absolute", left: -1, top: 5, width: 9, height: 9, borderRadius: "50%", background: EVENT_COLOR[ev.eventType] ?? "#8A8580", border: "2px solid #FDFBF7" }} />
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: EVENT_COLOR[ev.eventType] ?? "#8A8580", background: "rgba(139,115,85,0.07)", padding: "2px 8px" }}>
                      {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                    </span>
                    <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{ev.year}</span>
                    {!ev.isPublic && (
                      <span style={{ fontFamily: F, fontSize: 9, color: "#D0C8BF", background: "#F5F0EB", padding: "1px 6px", border: "1px solid #E8E3DB" }}>
                        {tr("비공개", "Private")}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: S, fontSize: 16, fontWeight: 400, color: "#1A1A1A", margin: "2px 0" }}>{ev.title}</p>
                  {ev.description && <p style={{ fontFamily: F, fontSize: 11, color: "#6A6660", margin: 0, lineHeight: 1.6 }}>{ev.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Stats Bar ── */}
        <div style={{ borderTop: "1px solid #E8E3DB", paddingTop: 32, display: "flex", gap: 32, flexWrap: "wrap" }}>
          {[
            { num: series.length, label: tr("시리즈", "Series") },
            { num: publicSeries.length, label: tr("공개 시리즈", "Public") },
            { num: exhibitions.length, label: tr("전시", "Exhibitions") },
            { num: artEvents.length, label: tr("활동", "Activities") },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ fontFamily: S, fontSize: 28, fontWeight: 300, color: "#1A1A1A" }}>{stat.num}</div>
              <div style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#B0AAA2", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}

function SeriesCard({ series: s, index, lang }: { series: SeriesItem; index: number; lang: string }) {
  const [expanded, setExpanded] = useState(false);
  const works = s.works
    ? s.works.split(/[,\n]/).map((w) => w.trim()).filter(Boolean)
    : [];

  return (
    <div style={{ background: "#FFFFFF", overflow: "hidden" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: "20px 24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transition: "background 0.15s" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FAF8F4"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FFFFFF"; }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0, flex: 1 }}>
          <span style={{ fontFamily: F, fontSize: 10, color: "#D4CEC4", flexShrink: 0 }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", margin: 0 }}>{s.title}</h3>
              {(s.startYear || s.endYear) && (
                <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
                  {s.startYear ?? "?"} — {s.endYear ?? (lang === "ko" ? "현재" : "present")}
                </span>
              )}
            </div>
            {s.description && !expanded && (
              <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 480 }}>
                {s.description}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!s.isPublic && (
            <span style={{ fontFamily: F, fontSize: 9, color: "#D0C8BF", background: "#F5F0EB", padding: "2px 8px", border: "1px solid #E8E3DB" }}>
              {lang === "ko" ? "비공개" : "Private"}
            </span>
          )}
          {works.length > 0 && (
            <span style={{ fontFamily: F, fontSize: 9, color: "#5A5A8B", background: "#EDEDF7", padding: "2px 8px", border: "1px solid #D4D4EE" }}>
              {works.length} {lang === "ko" ? "작품" : "works"}
            </span>
          )}
          <span style={{ fontFamily: F, fontSize: 14, color: "#B0AAA2", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>›</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 24px 24px", borderTop: "1px solid #F0EBE3" }}>
          {s.description && (
            <p style={{ fontFamily: F, fontSize: 13, color: "#4A4540", lineHeight: 1.8, margin: "20px 0 0", whiteSpace: "pre-wrap" }}>{s.description}</p>
          )}
          {works.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B0AAA2", margin: "0 0 12px" }}>
                {lang === "ko" ? "작품 목록" : "Works"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {works.map((w, i) => (
                  <span key={i} style={{ fontFamily: F, fontSize: 11, color: "#4A4540", background: "#F5F1EB", padding: "6px 12px", border: "1px solid #E8E3DB" }}>
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
