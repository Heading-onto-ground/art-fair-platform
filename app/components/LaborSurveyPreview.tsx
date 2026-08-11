"use client";

import { F, S, colors } from "@/lib/design";
import {
  CAREER_OPTIONS,
  CONTRACT_FREQ_OPTIONS,
  CONTRACT_TIMING_OPTIONS,
  EMPLOYMENT_OPTIONS,
  FIELD_OPTIONS,
} from "@/lib/laborSurveyTypes";

const sectionHead = {
  fontFamily: S,
  fontSize: 18,
  fontWeight: 400 as const,
  color: colors.textPrimary,
  margin: "20px 0 8px",
};

const label = {
  fontFamily: F,
  fontSize: 11,
  color: colors.textMuted,
  marginBottom: 4,
};

const field = {
  fontFamily: F,
  fontSize: 13,
  color: colors.textSecondary,
  padding: "10px 12px",
  border: `1px solid ${colors.border}`,
  background: colors.bgSecondary,
  marginBottom: 8,
};

export default function LaborSurveyPreview() {
  return (
    <div style={{ padding: "8px 0 24px" }}>
      <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, lineHeight: 1.7, marginBottom: 16 }}>
        참여자에게 보이는 설문 양식입니다. (미리보기 — 제출 불가)
      </p>

      <p style={{ ...label, marginTop: 0 }}>작가명 / 활동명</p>
      <div style={field}>@studio_name</div>
      <p style={label}>인스타그램 아이디</p>
      <div style={field}>@username</div>

      <h3 style={sectionHead}>A. 활동 현황</h3>
      <p style={label}>분야 *</p>
      <div style={field}>{FIELD_OPTIONS.join(" · ")}</div>
      <p style={label}>활동 경력 *</p>
      <div style={field}>{CAREER_OPTIONS.join(" · ")}</div>
      <p style={label}>전업·겸업</p>
      <div style={field}>{EMPLOYMENT_OPTIONS.join(" · ")}</div>
      <p style={label}>프리랜서 여부</p>
      <div style={field}>예 / 아니오</div>
      <p style={label}>주요 활동 형태</p>
      <div style={field}>자유 입력</div>

      <h3 style={sectionHead}>B. 계약 경험</h3>
      <p style={label}>서면 계약 체결 빈도</p>
      <div style={field}>{CONTRACT_FREQ_OPTIONS.map((o) => o.label).join(" · ")}</div>
      <p style={label}>계약 시점</p>
      <div style={field}>{CONTRACT_TIMING_OPTIONS.map((o) => o.label).join(" · ")}</div>
      <p style={label}>계약서 미수령 / 구두 후 서면 / 보수 삭감·지연</p>
      <div style={field}>각 항목 예·아니오</div>

      <h3 style={sectionHead}>C. 문제 제기 경험</h3>
      <p style={label}>부당 상황 대응 · 계약서 요구 어려움 · 불이익 우려</p>
      <div style={field}>서술 + 예·아니오</div>

      <h3 style={sectionHead}>D. 핵심 질문</h3>
      <div style={field}>
        예술인으로 일하면서 &apos;이건 노동인데?&apos;라고 느꼈던 경험 (서술형) *
      </div>

      <h3 style={sectionHead}>활용 동의</h3>
      <div style={{ ...field, lineHeight: 1.8 }}>
        □ 연구자료 활용 동의<br />
        □ 제도개선·정책자료 활용 동의<br />
        □ 국정감사 제보자료 활용 동의<br />
        □ 익명 사례로 활용 동의<br />
        □ 국감 제보자료 활용 원하지 않음
      </div>
    </div>
  );
}
