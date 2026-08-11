"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { F, S, colors } from "@/lib/design";
import {
  CAREER_OPTIONS,
  CONTRACT_FREQ_OPTIONS,
  CONTRACT_TIMING_OPTIONS,
  EMPLOYMENT_OPTIONS,
  FIELD_OPTIONS,
  emptyLaborSurveyAnswers,
  type LaborSurveyAnswers,
  type LaborSurveyAggregate,
  type LaborSurveyCampaignPublic,
  type LaborSurveyConsent,
} from "@/lib/laborSurveyTypes";

type Props = { lang: string };
type HomeTab = "survey" | "results";

type SessionInfo = { role: "artist" | "gallery" | "curator"; userId: string } | null;

const label: CSSProperties = {
  display: "block",
  marginTop: 14,
  marginBottom: 6,
  fontFamily: F,
  fontSize: 11,
  color: colors.textMuted,
};

const input: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: `1px solid ${colors.border}`,
  background: colors.bgCard,
  color: colors.textPrimary,
  fontFamily: F,
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
};

const sectionHead: CSSProperties = {
  fontFamily: S,
  fontSize: 20,
  fontWeight: 400,
  color: colors.textPrimary,
  margin: "24px 0 8px",
};

function YesNo({
  value,
  onChange,
  name,
}: {
  value: "yes" | "no";
  onChange: (v: "yes" | "no") => void;
  name: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
      {(["yes", "no"] as const).map((v) => (
        <label
          key={v}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 8px",
            border: `1px solid ${value === v ? colors.textPrimary : colors.border}`,
            background: value === v ? colors.textPrimary : colors.bgCard,
            color: value === v ? colors.bgPrimary : colors.textSecondary,
            fontFamily: F,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name={name}
            checked={value === v}
            onChange={() => onChange(v)}
            style={{ display: "none" }}
          />
          {v === "yes" ? "예" : "아니오"}
        </label>
      ))}
    </div>
  );
}

function AggregateBar({ label: barLabel, percent, total }: { label: string; percent: number | null; total: number }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <p style={{ margin: 0, fontFamily: F, fontSize: 13, color: colors.textPrimary, lineHeight: 1.5, flex: 1 }}>
          “{barLabel}”
        </p>
        <span style={{ fontFamily: S, fontSize: 22, color: colors.accent, flexShrink: 0 }}>
          {percent !== null ? `${percent}%` : "—"}
        </span>
      </div>
      <div style={{ height: 8, background: colors.bgAccent, borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: percent !== null ? `${percent}%` : "0%",
            background: colors.accent,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      {percent === null && total > 0 && (
        <p style={{ margin: "6px 0 0", fontFamily: F, fontSize: 11, color: colors.textLight }}>
          응답 {total}명 — 집계 공개 최소 인원 미달
        </p>
      )}
    </div>
  );
}

export default function LaborSurveyHome({ lang }: Props) {
  const ko = lang === "ko";

  const [tab, setTab] = useState<HomeTab>("survey");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [campaign, setCampaign] = useState<LaborSurveyCampaignPublic | null>(null);
  const [session, setSession] = useState<SessionInfo>(null);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);

  const [answers, setAnswers] = useState<LaborSurveyAnswers>(emptyLaborSurveyAnswers());
  const [consent, setConsent] = useState<LaborSurveyConsent>({
    consentResearch: false,
    consentPolicy: false,
    consentNationalAssembly: false,
    consentAnonymousCase: false,
    declineNationalAssembly: false,
  });

  const [aggregate, setAggregate] = useState<LaborSurveyAggregate | null>(null);
  const [aggregateLoading, setAggregateLoading] = useState(false);

  const loadSurvey = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/labor-survey", { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data?.campaign) setCampaign(data.campaign);
      setSession(data?.session ?? null);
      if (data?.mine) {
        setSubmittedAt(data.mine.submittedAt);
        setAnswers(data.mine.answers);
      } else if (data?.profilePrefill) {
        const pre = data.profilePrefill as { artistId?: string; instagram?: string };
        setAnswers((prev) => ({
          ...prev,
          artistDisplayName: pre.artistId ? `@${pre.artistId.replace(/^@+/, "")}` : prev.artistDisplayName,
          instagramId: pre.instagram
            ? pre.instagram.startsWith("@")
              ? pre.instagram
              : `@${pre.instagram.replace(/^@+/, "")}`
            : prev.instagramId,
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAggregate = useCallback(async (campaignId?: string) => {
    setAggregateLoading(true);
    try {
      const q = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";
      const res = await fetch(`/api/labor-survey/aggregate${q}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.aggregate) setAggregate(data.aggregate);
    } finally {
      setAggregateLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSurvey();
  }, [loadSurvey]);

  useEffect(() => {
    if (tab === "results" && campaign?.id) {
      loadAggregate(campaign.id);
    }
  }, [tab, campaign?.id, loadAggregate]);

  function setAnswer<K extends keyof LaborSurveyAnswers>(key: K, value: LaborSurveyAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!campaign) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/labor-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ campaignId: campaign.id, answers, consent }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const err = data?.error || "submit_failed";
        const messages: Record<string, string> = {
          artist_only: ko ? "예술가 계정으로 로그인해 주세요." : "Artist login required.",
          consent_required: ko ? "활용 동의 항목 중 하나 이상 선택해 주세요." : "Select at least one consent option.",
          conflicting_consent: ko ? "국감 활용 동의와 비동의를 동시에 선택할 수 없습니다." : "Conflicting consent selections.",
          required_fields_missing: ko
            ? "작가명 또는 인스타 아이디, 분야, 경력, 노동 경험 서술은 필수입니다."
            : "Artist name or Instagram, field, career, and labor experience are required.",
          campaign_closed: ko ? "설문이 마감되었습니다." : "Survey closed.",
        };
        throw new Error(messages[err] || err);
      }
      setSubmittedAt(data.submittedAt);
      setMessage(ko ? "응답이 저장되었습니다. 감사합니다." : "Your response has been saved. Thank you.");
      loadAggregate(campaign.id);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : ko ? "제출에 실패했습니다." : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const isArtist = session?.role === "artist";

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ padding: "16px 4px 12px" }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: colors.accent }}>
          {ko ? "사전 설문" : "Pre-event survey"}
        </span>
        <h1 style={{ fontFamily: S, fontSize: 26, fontWeight: 400, margin: "6px 0 4px", lineHeight: 1.25, color: colors.textPrimary }}>
          {campaign?.title ?? (ko ? "예술인 솔직담백 수다회" : "Artist roundtable")}
        </h1>
        {campaign?.subtitle && (
          <p style={{ fontFamily: S, fontSize: 18, color: colors.textSecondary, margin: "0 0 10px" }}>{campaign.subtitle}</p>
        )}
        <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, lineHeight: 1.7, margin: 0 }}>
          {campaign?.description ??
            (ko
              ? "당신의 경험을 먼저 듣습니다. 응답은 익명으로 집계되며, 연구·정책 자료로 활용될 수 있습니다."
              : "We listen to your experience first. Responses are aggregated anonymously.")}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}`, marginBottom: 4 }}>
        {([
          { id: "survey" as const, ko: "설문 응답", en: "Survey" },
          { id: "results" as const, ko: "집계 결과", en: "Results" },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: "12px 0",
              border: "none",
              borderBottom: `2px solid ${tab === t.id ? colors.textPrimary : "transparent"}`,
              background: "none",
              fontFamily: F,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: tab === t.id ? colors.textPrimary : colors.textMuted,
              cursor: "pointer",
            }}
          >
            {ko ? t.ko : t.en}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontFamily: F, fontSize: 13, color: colors.textLight, padding: "32px 4px" }}>
          {ko ? "불러오는 중..." : "Loading..."}
        </p>
      ) : tab === "results" ? (
        <div style={{ padding: "16px 4px" }}>
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, lineHeight: 1.7, marginBottom: 20 }}>
            {ko
              ? "오늘 참여자들의 사전 응답을 익명으로 집계합니다. 개인을 특정할 수 있는 정보는 포함되지 않습니다."
              : "Anonymous aggregate of pre-event responses. No personally identifying information."}
          </p>
          {aggregateLoading ? (
            <p style={{ fontFamily: F, fontSize: 13, color: colors.textLight }}>{ko ? "집계 중..." : "Loading..."}</p>
          ) : aggregate ? (
            <>
              <p style={{ fontFamily: F, fontSize: 11, color: colors.textLight, marginBottom: 20 }}>
                {ko ? `총 ${aggregate.responseCount}명 응답` : `${aggregate.responseCount} responses`}
              </p>
              {aggregate.responseCount === 0 ? (
                <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted }}>
                  {ko ? "아직 응답이 없습니다." : "No responses yet."}
                </p>
              ) : (
                aggregate.items.map((item) => (
                  <AggregateBar key={item.key} label={item.label} percent={item.percent} total={aggregate.responseCount} />
                ))
              )}
            </>
          ) : null}
        </div>
      ) : !session ? (
        <div style={{ padding: "24px 4px" }}>
          <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary, lineHeight: 1.7, marginBottom: 16 }}>
            {ko
              ? "설문 응답은 예술가 계정으로 로그인한 뒤 작성할 수 있습니다. 집계 결과 탭은 누구나 볼 수 있습니다."
              : "Log in as an artist to respond. Aggregate results are public."}
          </p>
          <Link
            href="/login?role=artist&redirect=/"
            style={{
              display: "inline-block",
              padding: "11px 20px",
              border: "none",
              background: colors.textPrimary,
              color: colors.bgPrimary,
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            {ko ? "예술가 로그인" : "Artist login"}
          </Link>
        </div>
      ) : !isArtist ? (
        <div style={{ padding: "24px 4px" }}>
          <p style={{ fontFamily: F, fontSize: 13, color: colors.textSecondary }}>
            {ko ? "이 설문은 예술가 계정 전용입니다." : "This survey is for artist accounts only."}
          </p>
        </div>
      ) : (
        <div style={{ padding: "8px 4px 24px" }}>
          {submittedAt && (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: 16,
                border: `1px solid ${colors.border}`,
                background: colors.accentSoft,
                fontFamily: F,
                fontSize: 12,
                color: colors.textSecondary,
              }}
            >
              {ko
                ? `이미 응답하셨습니다 (${new Date(submittedAt).toLocaleDateString()}). 수정 후 다시 제출할 수 있습니다.`
                : `Already submitted (${new Date(submittedAt).toLocaleDateString()}). You may update and resubmit.`}
            </div>
          )}

          <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, lineHeight: 1.7, margin: "0 0 4px" }}>
            {ko
              ? "본명은 수집하지 않습니다. 활동명(작가명) 또는 인스타그램 아이디 중 하나 이상을 입력해 주세요."
              : "We do not collect legal names. Please enter your artist name and/or Instagram handle."}
          </p>

          <label style={label}>{ko ? "작가명 / 활동명" : "Artist name"}</label>
          <input
            value={answers.artistDisplayName}
            onChange={(e) => setAnswer("artistDisplayName", e.target.value)}
            style={input}
            placeholder={ko ? "예: @studio_name, 화가OO" : "e.g. @studio_name"}
          />

          <label style={label}>{ko ? "인스타그램 아이디" : "Instagram handle"}</label>
          <input
            value={answers.instagramId}
            onChange={(e) => setAnswer("instagramId", e.target.value)}
            style={input}
            placeholder="@username"
          />

          <h2 style={sectionHead}>A. {ko ? "활동 현황" : "Activity"}</h2>

          <label style={label}>{ko ? "분야" : "Field"} *</label>
          <select value={answers.field} onChange={(e) => setAnswer("field", e.target.value)} style={input}>
            <option value="">{ko ? "선택" : "Select"}</option>
            {FIELD_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <label style={label}>{ko ? "활동 경력" : "Career length"} *</label>
          <select value={answers.careerYears} onChange={(e) => setAnswer("careerYears", e.target.value)} style={input}>
            <option value="">{ko ? "선택" : "Select"}</option>
            {CAREER_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <label style={label}>{ko ? "전업·겸업" : "Employment"}</label>
          <select value={answers.employmentType} onChange={(e) => setAnswer("employmentType", e.target.value)} style={input}>
            <option value="">{ko ? "선택" : "Select"}</option>
            {EMPLOYMENT_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <label style={label}>{ko ? "프리랜서(독립 활동) 여부" : "Freelance / independent"}</label>
          <YesNo
            name="freelancer"
            value={answers.isFreelancer === "yes" || answers.isFreelancer === "mixed" ? "yes" : "no"}
            onChange={(v) => setAnswer("isFreelancer", v)}
          />

          <label style={label}>{ko ? "주요 활동 형태" : "Main activity forms"}</label>
          <input
            value={answers.activityForms}
            onChange={(e) => setAnswer("activityForms", e.target.value)}
            style={input}
            placeholder={ko ? "예: 개인 창작, 강의, 공연, 프로젝트 참여" : "e.g. solo practice, teaching, performance"}
          />

          <h2 style={sectionHead}>B. {ko ? "계약 경험" : "Contracts"}</h2>

          <label style={label}>{ko ? "서면 계약 체결 빈도" : "Written contract frequency"}</label>
          <select
            value={answers.hasWrittenContract}
            onChange={(e) => setAnswer("hasWrittenContract", e.target.value as LaborSurveyAnswers["hasWrittenContract"])}
            style={input}
          >
            {CONTRACT_FREQ_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label style={label}>{ko ? "계약 시점" : "When contracts happen"}</label>
          <select
            value={answers.contractTiming}
            onChange={(e) => setAnswer("contractTiming", e.target.value as LaborSurveyAnswers["contractTiming"])}
            style={input}
          >
            {CONTRACT_TIMING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label style={label}>{ko ? "계약서를 받지 못한 경험" : "Did not receive a contract"}</label>
          <YesNo name="noContract" value={answers.noContractReceived} onChange={(v) => setAnswer("noContractReceived", v)} />

          <label style={label}>{ko ? "구두 계약 후 사후 서면 계약 경험" : "Verbal first, written later"}</label>
          <YesNo name="verbal" value={answers.verbalThenWritten} onChange={(v) => setAnswer("verbalThenWritten", v)} />

          <label style={label}>{ko ? "보수 삭감·지연 경험" : "Pay cut or delay"}</label>
          <YesNo name="payCut" value={answers.payCutOrDelay} onChange={(v) => setAnswer("payCutOrDelay", v)} />

          <h2 style={sectionHead}>C. {ko ? "문제 제기 경험" : "Speaking up"}</h2>

          <label style={label}>{ko ? "부당한 상황을 경험했을 때 어떻게 대응했는가" : "How you responded to unfair situations"}</label>
          <textarea
            value={answers.responseToUnfair}
            onChange={(e) => setAnswer("responseToUnfair", e.target.value)}
            style={{ ...input, minHeight: 90, resize: "vertical" }}
            placeholder={ko ? "침묵, 협상, 문제 제기, 포기 등" : "Silence, negotiation, complaint, gave up, etc."}
          />

          <label style={label}>{ko ? "계약서 작성을 요구하기 어려웠던 적이 있는가" : "Hard to ask for a written contract"}</label>
          <YesNo name="hardAsk" value={answers.hardToAskContract} onChange={(v) => setAnswer("hardToAskContract", v)} />

          {answers.hardToAskContract === "yes" && (
            <>
              <label style={label}>{ko ? "어려웠던 이유" : "Why it was hard"}</label>
              <textarea
                value={answers.hardToAskContractReason}
                onChange={(e) => setAnswer("hardToAskContractReason", e.target.value)}
                style={{ ...input, minHeight: 70, resize: "vertical" }}
              />
            </>
          )}

          <label style={label}>{ko ? "문제 제기 이후 불이익을 우려한 적이 있는가" : "Feared retaliation after speaking up"}</label>
          <YesNo name="fear" value={answers.fearRetaliation} onChange={(v) => setAnswer("fearRetaliation", v)} />

          <h2 style={sectionHead}>D. {ko ? "가장 중요한 질문" : "Key question"}</h2>
          <label style={label}>
            {ko
              ? "예술인으로 일하면서 '이건 노동인데?'라고 느꼈던 경험이 있다면 자유롭게 적어주세요. *"
              : "Describe a time you felt 'this is labor' as an artist. *"}
          </label>
          <textarea
            value={answers.laborExperience}
            onChange={(e) => setAnswer("laborExperience", e.target.value)}
            style={{ ...input, minHeight: 140, resize: "vertical" }}
            placeholder={ko ? "경험, 맥락, 감정 등 자유롭게" : "Experience, context, feelings — freely"}
          />

          <h2 style={sectionHead}>{ko ? "활용 동의" : "Consent"}</h2>
          <p style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, lineHeight: 1.6, margin: "0 0 10px" }}>
            {ko ? "아래 항목 중 하나 이상 선택해 주세요." : "Please select at least one option."}
          </p>

          {([
            { key: "consentResearch" as const, ko: "연구자료로 활용하는 데 동의합니다.", en: "Research use" },
            { key: "consentPolicy" as const, ko: "제도개선 및 정책자료로 활용하는 데 동의합니다.", en: "Policy improvement use" },
            { key: "consentNationalAssembly" as const, ko: "국정감사 제보자료로 활용하는 데 동의합니다.", en: "National Assembly reporting use" },
            { key: "consentAnonymousCase" as const, ko: "익명 사례로 활용하는 데 동의합니다.", en: "Anonymous case use" },
          ]).map((item) => (
            <label
              key={item.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 0",
                borderBottom: `1px solid ${colors.borderLight}`,
                fontFamily: F,
                fontSize: 12,
                color: colors.textSecondary,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={consent[item.key]}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setConsent((prev) => ({
                    ...prev,
                    [item.key]: checked,
                    ...(item.key === "consentNationalAssembly" && checked ? { declineNationalAssembly: false } : {}),
                  }));
                }}
                style={{ marginTop: 2 }}
              />
              <span>{ko ? item.ko : item.en}</span>
            </label>
          ))}

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 0",
              fontFamily: F,
              fontSize: 12,
              color: colors.textSecondary,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={consent.declineNationalAssembly}
              onChange={(e) => {
                const checked = e.target.checked;
                setConsent((prev) => ({
                  ...prev,
                  declineNationalAssembly: checked,
                  ...(checked ? { consentNationalAssembly: false } : {}),
                }));
              }}
              style={{ marginTop: 2 }}
            />
            <span>{ko ? "국감 제보자료 활용은 원하지 않습니다." : "I do not want National Assembly reporting use."}</span>
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={{
              width: "100%",
              marginTop: 20,
              padding: "14px",
              border: "none",
              background: submitting ? colors.border : colors.textPrimary,
              color: colors.bgPrimary,
              fontFamily: F,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? (ko ? "제출 중..." : "Submitting...") : ko ? "설문 제출" : "Submit survey"}
          </button>

          {message && (
            <p style={{ marginTop: 12, fontFamily: F, fontSize: 12, color: colors.textSecondary, lineHeight: 1.6 }}>{message}</p>
          )}
        </div>
      )}

      {/* Footer link to feed */}
      <div style={{ borderTop: `1px solid ${colors.border}`, padding: "16px 4px", marginTop: 8 }}>
        <Link
          href="/studio"
          style={{ fontFamily: F, fontSize: 11, color: colors.textMuted, textDecoration: "none", letterSpacing: "0.04em" }}
        >
          {ko ? "→ 작업 피드(스튜디오) 보기" : "→ View artwork studio feed"}
        </Link>
      </div>
    </div>
  );
}
