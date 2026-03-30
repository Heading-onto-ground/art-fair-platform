"use client";

import { F, S, colors } from "@/lib/design";

export type ProfileCompletionData = {
  // 기본 정보
  hasName: boolean;
  hasProfileImage: boolean;
  hasGenre: boolean;
  hasLocation: boolean; // country + city
  hasBio: boolean;
  hasSocialOrWebsite: boolean; // instagram or website
  // 포트폴리오
  hasWorkNote: boolean;
  hasSeries: boolean; // >= 1 ArtworkSeries
  hasArtEvents: boolean; // >= 1 ArtEvent
  hasPortfolioUrl: boolean;
};

type Step = {
  key: keyof ProfileCompletionData;
  label: { ko: string; en: string };
  points: number;
  anchor?: string; // page section hash
};

const STEPS: Step[] = [
  { key: "hasName", label: { ko: "이름 입력", en: "Add your name" }, points: 10 },
  { key: "hasProfileImage", label: { ko: "프로필 사진 등록", en: "Upload profile photo" }, points: 15, anchor: "profile-image" },
  { key: "hasGenre", label: { ko: "장르/매체 입력", en: "Set your genre/medium" }, points: 10 },
  { key: "hasLocation", label: { ko: "국가·도시 설정", en: "Set country & city" }, points: 10 },
  { key: "hasBio", label: { ko: "소개글 작성", en: "Write a bio" }, points: 15, anchor: "bio" },
  { key: "hasSocialOrWebsite", label: { ko: "인스타그램 또는 웹사이트 연결", en: "Link Instagram or website" }, points: 5 },
  { key: "hasWorkNote", label: { ko: "작업 노트 작성", en: "Write a work note" }, points: 10, anchor: "work-note" },
  { key: "hasSeries", label: { ko: "시리즈(작품) 1개 이상 등록", en: "Add at least one series" }, points: 10, anchor: "series" },
  { key: "hasArtEvents", label: { ko: "활동 기록 1개 이상 추가", en: "Add at least one activity" }, points: 10, anchor: "timeline" },
  { key: "hasPortfolioUrl", label: { ko: "포트폴리오 URL 등록", en: "Add portfolio URL" }, points: 5 },
];

function calcScore(data: ProfileCompletionData): number {
  return STEPS.reduce((acc, s) => acc + (data[s.key] ? s.points : 0), 0);
}

function scoreLabel(score: number, lang: string): string {
  if (score >= 90) return lang === "ko" ? "완성" : "Complete";
  if (score >= 70) return lang === "ko" ? "거의 완성" : "Almost there";
  if (score >= 40) return lang === "ko" ? "진행 중" : "In progress";
  return lang === "ko" ? "시작" : "Getting started";
}

function scoreColor(score: number): string {
  if (score >= 90) return colors.success;
  if (score >= 70) return colors.accent;
  if (score >= 40) return colors.warning;
  return colors.textMuted;
}

type Props = {
  data: ProfileCompletionData;
  lang: string;
  onAnchorClick?: (anchor: string) => void;
};

export default function ProfileCompletion({ data, lang, onAnchorClick }: Props) {
  const score = calcScore(data);
  const incomplete = STEPS.filter((s) => !data[s.key]);
  const complete = STEPS.filter((s) => data[s.key]);

  if (score === 100) {
    return (
      <div
        style={{
          border: `1px solid ${colors.success}`,
          background: "rgba(90,122,90,0.04)",
          padding: "20px 24px",
          marginBottom: 32,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 22 }}>✓</span>
        <div>
          <div style={{ fontFamily: F, fontSize: 12, fontWeight: 500, color: colors.success }}>
            {lang === "ko" ? "프로필 완성!" : "Profile complete!"}
          </div>
          <div style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
            {lang === "ko"
              ? "갤러리가 당신의 프로필을 발견할 준비가 되었습니다."
              : "Galleries can now discover your full profile."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        background: colors.bgCard,
        padding: "24px 28px",
        marginBottom: 32,
      }}
    >
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent, marginBottom: 4 }}>
            {lang === "ko" ? "프로필 완성도" : "Profile Completion"}
          </div>
          <div style={{ fontFamily: S, fontSize: 22, color: colors.textPrimary }}>
            {score}%{" "}
            <span style={{ fontSize: 14, color: scoreColor(score), fontFamily: F, fontWeight: 500 }}>
              {scoreLabel(score, lang)}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>
            {complete.length}/{STEPS.length} {lang === "ko" ? "완료" : "done"}
          </div>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div style={{ height: 4, background: colors.bgAccent, marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${score}%`,
            background: scoreColor(score),
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* 미완료 항목 */}
      {incomplete.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textMuted, marginBottom: 10 }}>
            {lang === "ko" ? "남은 항목" : "To do"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {incomplete.map((step) => (
              <div
                key={step.key}
                onClick={() => {
                  if (step.anchor && onAnchorClick) {
                    onAnchorClick(step.anchor);
                  } else if (step.anchor) {
                    document.getElementById(step.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  cursor: step.anchor ? "pointer" : "default",
                  background: colors.bgPrimary,
                  border: `1px solid ${colors.borderLight}`,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (step.anchor) e.currentTarget.style.background = colors.bgSecondary; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = colors.bgPrimary; }}
              >
                <div style={{ width: 16, height: 16, border: `1.5px solid ${colors.border}`, flexShrink: 0 }} />
                <span style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, flex: 1 }}>
                  {lang === "ko" ? step.label.ko : step.label.en}
                </span>
                <span style={{ fontFamily: F, fontSize: 10, color: colors.textLight }}>+{step.points}%</span>
                {step.anchor && (
                  <span style={{ fontFamily: F, fontSize: 10, color: colors.accent }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 완료 항목 (접힌 형태) */}
      {complete.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textLight, marginBottom: 6 }}>
            {lang === "ko" ? "완료됨" : "Completed"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {complete.map((step) => (
              <span
                key={step.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  background: "rgba(90,122,90,0.06)",
                  border: `1px solid rgba(90,122,90,0.15)`,
                  fontFamily: F,
                  fontSize: 11,
                  color: colors.success,
                }}
              >
                ✓ {lang === "ko" ? step.label.ko : step.label.en}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 갤러리 뷰 CTA */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: `1px solid ${colors.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontFamily: F, fontSize: 11, color: colors.textMuted }}>
          {lang === "ko"
            ? "갤러리에게 어떻게 보일지 확인하세요"
            : "See how galleries view your profile"}
        </span>
        <a
          href={`/artists`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: F,
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: colors.accent,
            textDecoration: "none",
            border: `1px solid ${colors.accent}`,
            padding: "6px 14px",
          }}
        >
          {lang === "ko" ? "공개 프로필 보기" : "View public profile"}
        </a>
      </div>
    </div>
  );
}
