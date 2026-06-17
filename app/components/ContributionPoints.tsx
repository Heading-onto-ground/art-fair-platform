"use client";

import { useState } from "react";
import { F, S, colors } from "@/lib/design";
import type { ContributionCategory, ContributionResult } from "@/lib/contributionPoints";
import { MATERIAL_BENEFIT_THRESHOLD } from "@/lib/contributionPoints";

const CATEGORY_LABELS: Record<ContributionCategory, { ko: string; en: string }> = {
  profile: { ko: "프로필", en: "Profile" },
  series: { ko: "시리즈", en: "Series" },
  activity: { ko: "활동 기록", en: "Activities" },
  exhibition: { ko: "전시", en: "Exhibitions" },
  ritual: { ko: "작업 기록", en: "Practice" },
  artwork: { ko: "작업", en: "Works" },
};

type Props = {
  contribution: ContributionResult;
  lang: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
};

export default function ContributionPoints({
  contribution,
  lang,
  loading,
  error,
  onRetry,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const ko = lang === "ko";

  const shellStyle = {
    border: `1px solid ${colors.border}`,
    background: colors.bgCard,
    padding: "24px 28px",
    marginBottom: 32,
  } as const;

  if (loading) {
    return (
      <div style={shellStyle}>
        <div style={{ fontFamily: F, fontSize: 11, color: colors.textMuted }}>
          {ko ? "활동 포인트 불러오는 중…" : "Loading contribution points…"}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={shellStyle}>
        <div
          style={{
            fontFamily: F,
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: colors.accent,
            marginBottom: 6,
          }}
        >
          {ko ? "ROB 활동 포인트" : "ROB Contribution"}
        </div>
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
          {ko
            ? "활동 포인트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "Could not load contribution points. Please try again."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: "8px 14px",
              border: `1px solid ${colors.border}`,
              background: colors.bgPrimary,
              fontFamily: F,
              fontSize: 11,
              color: colors.accent,
              cursor: "pointer",
            }}
          >
            {ko ? "다시 시도" : "Retry"}
          </button>
        )}
      </div>
    );
  }

  const { total, level, nextMilestone, progressToNext, materialBenefitEligible, items, summary } =
    contribution;

  const activeCategories = (Object.keys(summary) as ContributionCategory[]).filter(
    (k) => summary[k] > 0,
  );

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        background: colors.bgCard,
        padding: "24px 28px",
        marginBottom: 32,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div>
          <div
            style={{
              fontFamily: F,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: colors.accent,
              marginBottom: 6,
            }}
          >
            {ko ? "ROB 활동 포인트" : "ROB Contribution"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: S, fontSize: 36, color: colors.textPrimary, lineHeight: 1 }}>
              {total}
            </span>
            <span style={{ fontFamily: F, fontSize: 12, color: colors.textMuted }}>
              {ko ? "포인트" : "pts"}
            </span>
          </div>
          <div style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
            Level {level} · {ko ? contribution.levelLabelKo : contribution.levelLabelEn}
          </div>
        </div>
        {materialBenefitEligible ? (
          <span
            style={{
              fontFamily: F,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: colors.success,
              border: `1px solid ${colors.success}`,
              padding: "6px 12px",
              whiteSpace: "nowrap",
            }}
          >
            {ko ? "혜택 신청 가능" : "Benefits eligible"}
          </span>
        ) : (
          <span
            style={{
              fontFamily: F,
              fontSize: 10,
              color: colors.textMuted,
              textAlign: "right",
              maxWidth: 140,
              lineHeight: 1.4,
            }}
          >
            {ko
              ? `${MATERIAL_BENEFIT_THRESHOLD}pt 달성 시 혜택 신청`
              : `${MATERIAL_BENEFIT_THRESHOLD} pts for benefits`}
          </span>
        )}
      </div>

      {nextMilestone !== null && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              fontFamily: F,
              fontSize: 10,
              color: colors.textMuted,
            }}
          >
            <span>
              {ko ? "다음 목표" : "Next milestone"}: {nextMilestone} {ko ? "포인트" : "pts"}
            </span>
            <span>{progressToNext}%</span>
          </div>
          <div style={{ height: 4, background: colors.bgAccent, position: "relative", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${progressToNext}%`,
                background: colors.accent,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      )}

      {activeCategories.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: expanded ? 20 : 0 }}>
          {activeCategories.map((cat) => (
            <span
              key={cat}
              style={{
                fontFamily: F,
                fontSize: 11,
                padding: "5px 12px",
                background: colors.bgPrimary,
                border: `1px solid ${colors.borderLight}`,
                color: colors.textSecondary,
              }}
            >
              {ko ? CATEGORY_LABELS[cat].ko : CATEGORY_LABELS[cat].en}{" "}
              <strong style={{ color: colors.textPrimary }}>+{summary[cat]}</strong>
            </span>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              marginTop: 16,
              padding: 0,
              border: "none",
              background: "none",
              fontFamily: F,
              fontSize: 11,
              color: colors.accent,
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            {expanded
              ? ko
                ? "내역 접기 ▲"
                : "Hide breakdown ▲"
              : ko
                ? `포인트 내역 보기 (${items.length}) ▼`
                : `View breakdown (${items.length}) ▼`}
          </button>

          {expanded && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: colors.bgPrimary,
                    border: `1px solid ${colors.borderLight}`,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary }}>
                      {ko ? item.labelKo : item.labelEn}
                    </div>
                    <div style={{ fontFamily: F, fontSize: 10, color: colors.textLight, marginTop: 2 }}>
                      {ko ? CATEGORY_LABELS[item.category].ko : CATEGORY_LABELS[item.category].en}
                    </div>
                  </div>
                  <span style={{ fontFamily: F, fontSize: 13, fontWeight: 500, color: colors.accent }}>
                    +{item.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {items.length === 0 && (
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
          {ko
            ? "프로필을 채우고 시리즈·활동·작업을 기록하면 포인트가 쌓입니다."
            : "Complete your profile and record series, activities, and practice to earn points."}
        </p>
      )}
    </div>
  );
}
