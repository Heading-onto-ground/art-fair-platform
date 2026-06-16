"use client";

import { F, S, colors } from "@/lib/design";
import {
  PROFILE_STEPS,
  calcProfileScore,
  type ProfileCompletionData,
} from "@/lib/contributionPoints";

export type { ProfileCompletionData };

type Step = {
  key: keyof ProfileCompletionData;
  label: { ko: string; en: string };
  points: number;
  anchor?: string;
};

const STEPS: Step[] = [
  { key: "hasName", label: { ko: PROFILE_STEPS[0].labelKo, en: PROFILE_STEPS[0].labelEn }, points: PROFILE_STEPS[0].points },
  { key: "hasProfileImage", label: { ko: PROFILE_STEPS[1].labelKo, en: PROFILE_STEPS[1].labelEn }, points: PROFILE_STEPS[1].points, anchor: "profile-image" },
  { key: "hasGenre", label: { ko: PROFILE_STEPS[2].labelKo, en: PROFILE_STEPS[2].labelEn }, points: PROFILE_STEPS[2].points },
  { key: "hasLocation", label: { ko: PROFILE_STEPS[3].labelKo, en: PROFILE_STEPS[3].labelEn }, points: PROFILE_STEPS[3].points },
  { key: "hasBio", label: { ko: PROFILE_STEPS[4].labelKo, en: PROFILE_STEPS[4].labelEn }, points: PROFILE_STEPS[4].points, anchor: "bio" },
  { key: "hasSocialOrWebsite", label: { ko: PROFILE_STEPS[5].labelKo, en: PROFILE_STEPS[5].labelEn }, points: PROFILE_STEPS[5].points },
  { key: "hasWorkNote", label: { ko: PROFILE_STEPS[6].labelKo, en: PROFILE_STEPS[6].labelEn }, points: PROFILE_STEPS[6].points, anchor: "work-note" },
  { key: "hasSeries", label: { ko: PROFILE_STEPS[7].labelKo, en: PROFILE_STEPS[7].labelEn }, points: PROFILE_STEPS[7].points, anchor: "series" },
  { key: "hasArtEvents", label: { ko: PROFILE_STEPS[8].labelKo, en: PROFILE_STEPS[8].labelEn }, points: PROFILE_STEPS[8].points, anchor: "timeline" },
  { key: "hasPortfolioUrl", label: { ko: PROFILE_STEPS[9].labelKo, en: PROFILE_STEPS[9].labelEn }, points: PROFILE_STEPS[9].points },
];

function calcScore(data: ProfileCompletionData): number {
  return calcProfileScore(data);
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
