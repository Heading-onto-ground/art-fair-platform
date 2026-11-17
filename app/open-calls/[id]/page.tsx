"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import OpenCallPoster from "@/app/components/OpenCallPoster";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";
import { applicationRouteLabel, applyDestination, costLines, deadlineStatus, eligibilityDisplay, listingFacts, locationLine, organizerDisplay, typeDisplay } from "@/lib/openCall/listingFacts";
import { PREPARATION_DISCLAIMER_KO, preparationStatusLabel, type PreparationStatus } from "@/lib/openCall/preparationStatus";
import { pushRobEventOnce } from "@/lib/publicGrowth/analytics";

type Role = "artist" | "gallery";
type MeResponse = { session: { userId: string; role: Role; email?: string } | null; profile: any | null };
type OpenCall = { id: string; galleryId: string; gallery: string; city: string; country: string; theme: string; exhibitionDate?: string; deadline: string; posterImage?: string | null; isExternal?: boolean; externalEmail?: string; externalUrl?: string; galleryWebsite?: string; galleryDescription?: string };
type Application = { id: string; openCallId: string; galleryId: string; artistId: string; artistName: string; artistEmail: string; artistCountry: string; artistCity: string; artistPortfolioUrl?: string; message?: string; status: "submitted" | "reviewing" | "accepted" | "rejected"; shippingStatus: "pending" | "shipped" | "received" | "inspected" | "exhibited"; shippingNote?: string; shippingCarrier?: string; trackingNumber?: string; trackingUrl?: string; createdAt: number; updatedAt: number };
type OutreachResult = { isExternal?: boolean; sent?: boolean; reason?: string | null; targetEmail?: string | null; instagram?: string };

async function fetchMe(): Promise<MeResponse | null> { try { const res = await fetch("/api/auth/me?lite=1", { cache: "default", credentials: "include" }); return (await res.json().catch(() => null)) as MeResponse | null; } catch { return null; } }

const inp: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#1A1A1A", fontFamily: F, fontSize: 13, outline: "none" };
const btn = (disabled: boolean): React.CSSProperties => ({ padding: "14px 28px", border: "none", background: disabled ? "#E8E3DB" : "#1A1A1A", color: disabled ? "#8A8580" : "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer" });
const primaryLink: React.CSSProperties = { ...btn(false), display: "inline-flex", alignItems: "center", textDecoration: "none", fontSize: 15, letterSpacing: "0.01em", textTransform: "none", padding: "14px 18px" };

function hostFromUrl(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function formatDeadlineLocal(deadline: string, lang: string): string {
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return deadline;
  const locale = lang === "ko" ? "ko-KR" : lang === "ja" ? "ja-JP" : lang === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(d);
}

function buildApplyTemplate(lang: string, gallery: string, theme: string, variant: "short" | "portfolio" | "local") {
  if (lang === "ko") {
    if (variant === "portfolio") return `안녕하세요 ${gallery} 팀,\n\n"${theme}" 오픈콜에 지원하고 싶습니다. 제 작업 방향과 기존 포트폴리오가 이번 주제와 잘 맞는다고 생각합니다. 검토 부탁드립니다.\n\n감사합니다.`;
    if (variant === "local") return `안녕하세요 ${gallery} 팀,\n\n같은 지역 기반으로 활동하며 "${theme}" 주제에 관심이 있어 지원드립니다. 전시/협업 관련 논의를 이어가고 싶습니다.\n\n감사합니다.`;
    return `안녕하세요 ${gallery} 팀,\n\n"${theme}" 오픈콜에 지원드립니다. 제 작업이 이번 전시 취지와 맞아 검토 부탁드립니다.\n\n감사합니다.`;
  }
  if (lang === "ja") {
    if (variant === "portfolio") return `${gallery} チームの皆様\n\n「${theme}」オープンコールに応募いたします。私の制作テーマとポートフォリオが本企画に適していると考えています。ご確認をお願いいたします。`;
    if (variant === "local") return `${gallery} チームの皆様\n\n同地域で活動しており、「${theme}」に強い関心があります。展示・協働についてご相談できれば幸いです。`;
    return `${gallery} チームの皆様\n\n「${theme}」オープンコールに応募いたします。企画意図に沿う内容だと考えております。よろしくお願いいたします。`;
  }
  if (variant === "portfolio") return `Hello ${gallery} team,\n\nI would like to apply for "${theme}". I believe my current body of work and portfolio align with this open call. Thank you for reviewing my application.`;
  if (variant === "local") return `Hello ${gallery} team,\n\nI am based in your region and very interested in "${theme}". I would love to discuss possible exhibition collaboration through this open call.`;
  return `Hello ${gallery} team,\n\nI am applying to "${theme}" and would be grateful for your review. I believe my practice aligns well with this opportunity.`;
}

export default function OpenCallDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { lang } = useLanguage();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [openCall, setOpenCall] = useState<OpenCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [shipNote, setShipNote] = useState(""); const [shipCarrier, setShipCarrier] = useState(""); const [shipTrackingNumber, setShipTrackingNumber] = useState(""); const [shipTrackingUrl, setShipTrackingUrl] = useState(""); const [shipSaving, setShipSaving] = useState(false); const [showShipping, setShowShipping] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [translatedTheme, setTranslatedTheme] = useState<string | null>(null);
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [outreachResult, setOutreachResult] = useState<OutreachResult | null>(null);
  const [prepStatus, setPrepStatus] = useState<PreparationStatus | null>(null);
  const [prepNote, setPrepNote] = useState("");
  const [prepSaving, setPrepSaving] = useState(false);

  async function translateText(text: string, targetLang: string): Promise<string | null> {
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, targetLang }) });
      const data = await res.json();
      return data.ok && data.translated ? data.translated : null;
    } catch { return null; }
  }

  async function translateTheme() { if (!openCall?.theme) return; if (translatedTheme) { setShowTranslation(!showTranslation); return; } setTranslating(true); try { const translated = await translateText(openCall.theme, lang); if (translated) { setTranslatedTheme(translated); setShowTranslation(true); } if (openCall.galleryDescription) { const descTranslated = await translateText(openCall.galleryDescription, lang); if (descTranslated) setTranslatedDesc(descTranslated); } } catch (e) { console.error(e); } finally { setTranslating(false); } }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const [meData, openCallRes] = await Promise.all([
          fetchMe(),
          fetch(`/api/open-calls/${params.id}`, { cache: "default", credentials: "include" }),
        ]);
        const openCallData = await openCallRes.json().catch(() => null);
        if (cancelled) return;
        setMe(meData);
        if (!openCallRes.ok) throw new Error(openCallData?.error ?? `Failed (${openCallRes.status})`);
        setOpenCall((openCallData?.openCall ?? null) as OpenCall | null);
      } catch (e: any) {
        if (cancelled) return;
        setOpenCall(null);
        setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    if (!openCall) return;
    pushRobEventOnce("OPEN_CALL_DETAIL_VIEWED", openCall.id, {
      open_call_id: openCall.id,
      application_route: openCall.isExternal ? "external" : "rob",
    });
  }, [openCall?.id, openCall?.isExternal]);

  useEffect(() => { if (!openCall || !me?.session) return; const session = me.session; (async () => { try { setLoadingApps(true); const res = await fetch(`/api/applications?openCallId=${openCall.id}`, { cache: "default", credentials: "include" }); const data = await res.json().catch(() => null); if (!res.ok) { setApplications([]); setMyApplication(null); return; } const list = Array.isArray(data?.applications) ? data.applications : []; if (session.role === "artist") { setMyApplication(list[0] ?? null); setApplications([]); } else if (session.role === "gallery") { setApplications(session.userId === openCall.galleryId ? list : []); setMyApplication(null); } } finally { setLoadingApps(false); } })(); }, [openCall?.id, me?.session?.userId]);

  useEffect(() => { if (!myApplication) return; setShipNote(myApplication.shippingNote ?? ""); setShipCarrier(myApplication.shippingCarrier ?? ""); setShipTrackingNumber(myApplication.trackingNumber ?? ""); setShipTrackingUrl(myApplication.trackingUrl ?? ""); }, [myApplication?.id]);

  useEffect(() => {
    if (!openCall || me?.session?.role !== "artist") return;
    let cancelled = false;
    fetch(`/api/open-calls/${openCall.id}/preparation`, { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        setPrepStatus(data?.preparation?.status ?? null);
        setPrepNote(data?.preparation?.note ?? "");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [openCall?.id, me?.session?.userId, me?.session?.role]);

  async function savePrep(status: PreparationStatus) {
    if (!openCall) return;
    setPrepSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/open-calls/${openCall.id}/preparation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, note: prepNote }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.preparation) throw new Error(data?.error ?? "Failed");
      const previous = prepStatus;
      setPrepStatus(data.preparation.status);
      setPrepNote(data.preparation.note ?? "");
      if (status === "SAVED" && previous !== "SAVED") {
        pushRobEventOnce("OPEN_CALL_SAVED", openCall.id, { open_call_id: openCall.id });
      }
      if ((status === "PREPARING" || status === "READY") && previous !== "PREPARING" && previous !== "READY" && previous !== "APPLIED") {
        pushRobEventOnce("OPEN_CALL_PREP_STARTED", openCall.id, { open_call_id: openCall.id });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPrepSaving(false);
    }
  }

  async function clearPrep() {
    if (!openCall) return;
    setPrepSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/open-calls/${openCall.id}/preparation`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      setPrepStatus(null);
      setPrepNote("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPrepSaving(false);
    }
  }

  async function contactGallery() { if (!openCall) return; setContacting(true); setError(null); try { const m = me ?? (await fetchMe()); if (!m?.session) { router.push("/login"); return; } if (m.session.role !== "artist") throw new Error("Artists only"); const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ openCallId: openCall.id, galleryId: openCall.galleryId }) }); const data = await res.json().catch(() => null); if (!res.ok || !data?.roomId) throw new Error(data?.error ?? "Failed"); router.push(`/chat/${data.roomId}`); } catch (e: any) { setError(e?.message ?? "Failed"); } finally { setContacting(false); } }

  async function applyToOpenCall() { if (!openCall) return; setApplying(true); setError(null); try { const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ openCallId: openCall.id, message: applyMessage.trim() || undefined }) }); const data = await res.json().catch(() => null); if (!res.ok || !data?.application) throw new Error(data?.error ?? "Failed"); setMyApplication(data.application as Application); setOutreachResult((data?.outreach ?? null) as OutreachResult | null); if (data.emailSent) setEmailSent(true); pushRobEventOnce("OPEN_CALL_INTERNAL_SUBMITTED", openCall.id, { open_call_id: openCall.id, application_route: "rob" }); } catch (e: any) { setError(e?.message ?? "Failed"); } finally { setApplying(false); } }

  function trackApplyExit(destination: "official" | "notice" | "source") {
    if (!openCall) return;
    pushRobEventOnce("OPEN_CALL_APPLY_EXIT", `${openCall.id}:${destination}`, {
      open_call_id: openCall.id,
      destination,
      application_route: "external",
    });
  }

  async function markShipped() { if (!myApplication) return; setShipSaving(true); setError(null); try { const res = await fetch(`/api/applications/${myApplication.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ shippingStatus: "shipped", shippingNote: shipNote.trim() || undefined, shippingCarrier: shipCarrier.trim() || undefined, trackingNumber: shipTrackingNumber.trim() || undefined, trackingUrl: shipTrackingUrl.trim() || undefined }) }); const data = await res.json().catch(() => null); if (!res.ok || !data?.application) throw new Error(data?.error ?? "Failed"); setMyApplication(data.application as Application); } catch (e: any) { setError(e?.message ?? "Failed"); } finally { setShipSaving(false); } }

  async function updateAppStatus(id: string, status: string) { setStatusUpdatingId(id); try { const res = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status }) }); const data = await res.json().catch(() => null); if (res.ok && data?.application) setApplications((p) => p.map((a) => a.id === id ? (data.application as Application) : a)); } finally { setStatusUpdatingId(null); } }
  async function updateShipStatus(id: string, shippingStatus: string) { setStatusUpdatingId(id); try { const res = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ shippingStatus }) }); const data = await res.json().catch(() => null); if (res.ok && data?.application) setApplications((p) => p.map((a) => a.id === id ? (data.application as Application) : a)); } finally { setStatusUpdatingId(null); } }

  const role = me?.session?.role ?? null;
  const canContact = role === "artist";
  const isOwner = role === "gallery" && me?.session?.userId === openCall?.galleryId;
  const facts = openCall ? listingFacts(openCall) : null;
  const place = facts && openCall ? locationLine(facts, openCall.city) : null;
  const destination = facts && openCall ? applyDestination(facts, openCall.externalUrl) : null;
  const closed = openCall ? deadlineStatus(openCall.deadline) === "closed" : false;
  const costs = facts ? costLines(facts, lang) : [];
  const applyLabels = {
    official: lang === "ko" ? "공식 지원 페이지 확인" : "Check the official application page",
    notice: lang === "ko" ? "공고에 적힌 페이지에서 확인" : "Check the page named in the notice",
    source: lang === "ko" ? "원문에서 지원 방법 확인" : "Check how to apply on the source",
  };
  const prepChoices: PreparationStatus[] = prepStatus === "PLANNING"
    ? ["PLANNING", "SAVED", "PREPARING", "READY", "APPLIED", "RESULT_RECORDED"]
    : ["SAVED", "PREPARING", "READY", "APPLIED", "RESULT_RECORDED"];

  return (
    <>
      <TopBar />
      <style>{`
        .oc-detail-main { padding: 48px 40px 88px; max-width: 860px; margin: 0 auto; }
        .oc-decision { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; margin-top: 22px; }
        .oc-decision p { font-family: var(--font-inter), sans-serif; font-size: 16px; line-height: 1.45; color: #1A1A1A; margin: 0; overflow-wrap: anywhere; }
        .oc-decision .oc-label { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: #5C5854; margin: 0 0 4px; }
        .oc-cost { margin: 8px 0 0; padding: 0; list-style: none; }
        .oc-cost li { display: flex; justify-content: space-between; gap: 8px 12px; flex-wrap: wrap; padding: 6px 0; border-bottom: 1px solid #F0EDE8; font-family: var(--font-inter), sans-serif; font-size: 15px; color: #1A1A1A; }
        .oc-cost span { color: #5C5854; }
        .oc-call-title { font-family: var(--font-cormorant), Georgia, serif; font-size: 36px; font-weight: 500; color: #1A1A1A; margin: 8px 0 0; line-height: 1.25; overflow-wrap: anywhere; }
        @media (max-width: 768px) {
          .oc-detail-main { padding: 24px 16px calc(96px + env(safe-area-inset-bottom)) !important; }
          .oc-detail-body { padding: 20px !important; }
          .oc-decision { grid-template-columns: 1fr; }
          .oc-call-title { font-size: 30px; }
          .oc-prep-controls { display: flex; flex-wrap: wrap; }
        }
      `}</style>
      <main id="main-content" className="oc-detail-main">
        <button onClick={() => router.back()} style={{ marginBottom: 28, background: "transparent", border: "none", color: "#8A8580", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", cursor: "pointer" }}>
          &larr; {t("back", lang)}
        </button>

        {loading ? <p style={{ fontFamily: F, color: "#B0AAA2" }}>{t("loading", lang)}</p>
        : error ? <div style={{ padding: 20, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>{error}</div>
        : !openCall ? <p style={{ fontFamily: F, color: "#B0AAA2" }}>Not found</p>
        : (
          <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", overflow: "hidden" }}>
            {openCall.posterImage && (
              <OpenCallPoster
                posterImage={openCall.posterImage}
                gallery={openCall.gallery}
                theme={openCall.theme}
                city={place && !place.usesStoredCity ? place.text : openCall.city}
                country={openCall.country}
                deadline={openCall.deadline}
                hero
              />
            )}

            <div className="oc-detail-body" style={{ padding: 40 }}>
            <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>
              {openCall.country} / {place?.text || openCall.city}
            </span>
            {facts?.cityNeedsCheck && (
              <div style={{ fontFamily: F, fontSize: 14, color: "#3F3C38", marginTop: 8, lineHeight: 1.6 }}>
                {lang === "ko"
                  ? (facts.statedPlace
                    ? `수집된 도시명 ${openCall.city}은 본문 장소와 달라 전시 위치로 표시하지 않습니다.`
                    : `수집된 도시명 ${openCall.city}은 공고 본문에서 확인되지 않아 전시 위치로 표시하지 않습니다.`)
                  : (facts.statedPlace
                    ? `The stored city ${openCall.city} conflicts with the notice, so it is not shown as the location.`
                    : `The stored city ${openCall.city} is not supported by the notice, so it is not shown as the location.`)}
              </div>
            )}
            {facts?.statedPlace && place?.usesStoredCity && (
              <div style={{ fontFamily: F, fontSize: 12, color: "#6A6660", marginTop: 8, lineHeight: 1.6 }}>
                {lang === "ko" ? "공고 본문 장소" : "Place stated in the notice"}: {facts.statedPlace}
              </div>
            )}

            <h1 className="oc-call-title">
              {openCall.gallery}
            </h1>
            <p style={{ fontFamily: F, fontSize: 14, color: "#3F3C38", margin: "8px 0 0" }}>
              {applicationRouteLabel(openCall.isExternal, lang)}
              {facts ? ` · ${typeDisplay(facts.kind)}` : ""}
            </p>

            {(facts?.organizerUrl || (openCall.galleryWebsite && !facts?.websiteIsFeed) || openCall.externalUrl) && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {facts?.organizerUrl && (
                  <a
                    href={facts.organizerUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: F,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#8B7355",
                      textDecoration: "none",
                      border: "1px solid #E8E3DB",
                      padding: "6px 10px",
                    }}
                  >
                    {facts.officialApplicationUrl
                      ? (lang === "ko" ? "주최 페이지" : "Organizer page")
                      : (lang === "ko" ? "공고에 적힌 링크" : "Link written in the notice")}
                  </a>
                )}
                {openCall.galleryWebsite && !facts?.websiteIsFeed && (
                  <a
                    href={openCall.galleryWebsite}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: F,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#8B7355",
                      textDecoration: "none",
                      border: "1px solid #E8E3DB",
                      padding: "6px 10px",
                    }}
                  >
                    {hostFromUrl(openCall.galleryWebsite) || "Website"}
                  </a>
                )}
                {openCall.externalUrl && (
                  <a
                    href={openCall.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: F,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#8A8580",
                      textDecoration: "none",
                      border: "1px solid #E8E3DB",
                      padding: "6px 10px",
                    }}
                  >
                    {facts?.sourceRole === "reprint"
                      ? (lang === "ko" ? "전재 글" : "Republished notice")
                      : t("oc_source", lang)}
                  </a>
                )}
              </div>
            )}

            <section className="oc-decision" aria-label={lang === "ko" ? "지원 판단" : "Application decision"}>
              <div>
                <p className="oc-label">{lang === "ko" ? "주최" : "Organizer"}</p>
                <p>{organizerDisplay(facts?.organizerName ?? null, lang)}</p>
                {facts?.sourceRole === "reprint" && facts.organizerName && (
                  <p style={{ marginTop: 4, fontSize: 13, color: "#5C5854" }}>{lang === "ko" ? "공고 본문에 적힌 주관입니다." : "Named in the notice text."}</p>
                )}
              </div>
              <div>
                <p className="oc-label">{lang === "ko" ? "지원 자격" : "Eligibility"}</p>
                <p>{facts ? eligibilityDisplay(facts.eligibility) : ""}</p>
              </div>
              <div>
                <p className="oc-label">{closed ? (lang === "ko" ? "마감됨" : "Closed") : (lang === "ko" ? "지원 마감" : "Deadline")}</p>
                <p style={{ color: closed ? "#8B4A4A" : "#1A1A1A" }}>{formatDeadlineLocal(openCall.deadline, lang)}</p>
                <p style={{ marginTop: 4, fontSize: 13, color: "#5C5854" }}>
                  {openCall.exhibitionDate
                    ? (lang === "ko" ? `전시 일정 ${openCall.exhibitionDate}` : `Exhibition ${openCall.exhibitionDate}`)
                    : (lang === "ko" ? "전시 일정 미확인" : "Exhibition dates unconfirmed")}
                </p>
              </div>
              <div>
                <p className="oc-label">{lang === "ko" ? "비용" : "Costs"}</p>
                <ul className="oc-cost">
                  {costs.map((line) => (
                    <li key={line.key}><span>{line.label}</span><strong style={{ fontWeight: 600 }}>{line.value}</strong></li>
                  ))}
                </ul>
                <p style={{ marginTop: 8, fontSize: 13, color: "#3F3C38" }}>
                  {lang === "ko"
                    ? "없는 항목은 공고 원문 확인이 필요합니다. 지원비가 없어도 다른 비용까지 없다는 뜻은 아닙니다."
                    : "Unconfirmed items have to be checked in the notice. No application fee does not mean the rest is free."}
                </p>
              </div>
            </section>
            {facts?.support && (
              <p style={{ fontFamily: F, fontSize: 14, color: "#3F3C38", margin: "14px 0 0" }}>
                {lang === "ko" ? "공고에 적힌 지원" : "Support named in the notice"}: {facts.support}
              </p>
            )}

            <div style={{ marginTop: 22 }}>
              {openCall.isExternal && destination && (
                <a
                  href={destination.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackApplyExit(destination.kind)}
                  style={primaryLink}
                >
                  {closed
                    ? (lang === "ko" ? "원문에서 마감 여부 확인" : "Check whether the notice is closed")
                    : applyLabels[destination.kind]}
                </a>
              )}
              {openCall.isExternal && !destination && (
                <p style={{ fontFamily: F, fontSize: 15, color: "#1A1A1A", margin: 0 }}>
                  {lang === "ko" ? "지원 경로 미확인. 공고 원문 확인이 필요합니다." : "Application path unconfirmed. Check the original notice."}
                </p>
              )}
              {!openCall.isExternal && role === "artist" && (
                <a href="#rob-application" style={primaryLink}>
                  {lang === "ko" ? "ROB에서 지원서 작성" : "Write the application on ROB"}
                </a>
              )}
              {!openCall.isExternal && role !== "artist" && (
                <a href={`/login?redirect=${encodeURIComponent(`/open-calls/${openCall.id}`)}`} style={primaryLink}>
                  {lang === "ko" ? "로그인 후 ROB에서 지원" : "Log in to apply on ROB"}
                </a>
              )}
              {openCall.isExternal && (
                <p style={{ fontFamily: F, fontSize: 13, color: "#3F3C38", margin: "8px 0 0" }}>
                  {lang === "ko" ? "링크를 열어도 접수 완료로 기록되지 않습니다." : "Opening the link is not recorded as a submission."}
                </p>
              )}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
                <a href={`/api/open-calls/${openCall.id}/calendar`} style={{ fontFamily: F, fontSize: 14, color: "#3F3C38" }}>{t("oc_add_calendar", lang)}</a>
                {canContact && !openCall.isExternal && (
                  <button onClick={contactGallery} disabled={contacting} style={{ background: "transparent", border: "none", padding: 0, color: "#3F3C38", fontFamily: F, fontSize: 14, cursor: contacting ? "wait" : "pointer" }}>
                    {contacting ? "..." : t("oc_contact_gallery", lang)}
                  </button>
                )}
              </div>
            </div>

            {!me?.session && (
              <p style={{ fontFamily: F, fontSize: 14, lineHeight: 1.6, color: "#3F3C38", margin: "18px 0 0" }}>
                <a href={`/login?redirect=${encodeURIComponent(`/open-calls/${openCall.id}`)}`} style={{ color: "#1A1A1A" }}>
                  {lang === "ko" ? "로그인" : "Log in"}
                </a>
                {lang === "ko" ? "하면 이 공고를 저장하고 준비 상태를 남길 수 있습니다. 저장은 접수 완료가 아닙니다." : " to save this call and keep a private preparation status. Saving is not a submission."}
              </p>
            )}

            {openCall.theme && openCall.theme !== openCall.gallery && (
              <p style={{ fontFamily: F, fontSize: 14, color: "#5C5854", margin: "18px 0 0", lineHeight: 1.5 }}>{openCall.theme}</p>
            )}
            {openCall.galleryDescription && (
              <details style={{ marginTop: 16 }}>
                <summary style={{ fontFamily: F, fontSize: 14, color: "#1A1A1A", cursor: "pointer" }}>
                  {lang === "ko" ? "공고 본문" : "Notice text"}
                </summary>
                <p style={{ fontFamily: F, fontSize: 14, color: "#3F3C38", marginTop: 10, lineHeight: 1.7 }}>
                  {showTranslation && translatedDesc ? translatedDesc : openCall.galleryDescription}
                </p>
                <button onClick={translateTheme} disabled={translating} style={{ ...inp, width: "auto", marginTop: 8, padding: "8px 12px", fontSize: 13, color: "#3F3C38", cursor: translating ? "wait" : "pointer" }}>
                  {translating ? "..." : showTranslation ? (lang === "ko" ? "원문 보기" : "Show the original") : (lang === "ko" ? "본문 번역" : "Translate")}
                </button>
              </details>
            )}

            {/* Artist apply */}
            {role === "artist" && (
              <div style={{ marginTop: 36, borderTop: "1px solid #E8E3DB", paddingTop: 28 }}>
                <h3 style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A", margin: "0 0 8px" }}>
                  {lang === "ko" ? "개인 준비 기록" : "Private preparation"}
                </h3>
                <p style={{ fontFamily: F, fontSize: 14, color: "#3F3C38", lineHeight: 1.6, margin: "0 0 12px" }}>
                  {PREPARATION_DISCLAIMER_KO}
                  {lang === "ko" ? " 저장, 준비 완료, 접수 완료 표시는 서로 다른 기록입니다." : " Saved, ready, and marked submitted are different records."}
                </p>
                <div className="oc-prep-controls" role="group" aria-label={lang === "ko" ? "개인 준비 상태" : "Private preparation status"} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {prepChoices.map((status) => {
                    const selected = prepStatus === status;
                    return (
                    <button
                      key={status}
                      type="button"
                      disabled={prepSaving}
                      aria-pressed={selected}
                      onClick={() => savePrep(status)}
                      style={{
                        border: selected ? "1px solid #1A1A1A" : "1px solid #E8E3DB",
                        background: selected ? "#1A1A1A" : "#FFFFFF",
                        fontFamily: F,
                        fontSize: 13,
                        letterSpacing: "0.02em",
                        padding: "10px 12px",
                        color: selected ? "#FDFBF7" : "#3F3C38",
                        cursor: prepSaving ? "wait" : "pointer",
                      }}
                    >
                      {selected ? (lang === "ko" ? "선택됨 · " : "Selected · ") : ""}{preparationStatusLabel(status, lang)}
                    </button>
                    );
                  })}
                </div>
                <textarea
                  value={prepNote}
                  onChange={(e) => setPrepNote(e.target.value)}
                  placeholder={lang === "ko" ? "준비 메모. 결과도 여기 적습니다." : "Preparation note. Record the result here too."}
                  rows={3}
                  style={{ ...inp, resize: "vertical" }}
                />
                {prepStatus && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 16px" }}>
                    <button type="button" onClick={() => savePrep(prepStatus)} disabled={prepSaving} style={btn(prepSaving)}>
                      {prepSaving ? "..." : (lang === "ko" ? "메모 저장" : "Save note")}
                    </button>
                    <button type="button" onClick={clearPrep} disabled={prepSaving} style={{ ...btn(false), background: "transparent", color: "#8A8580", border: "1px solid #E8E3DB" }}>
                      {lang === "ko" ? "기록 지우기" : "Clear record"}
                    </button>
                  </div>
                )}

                {openCall.isExternal ? null : (
                <div id="rob-application">
                <h3 style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A", margin: "16px 0 8px" }}>{t("oc_apply_to", lang)}</h3>
                {myApplication ? (
                  <div>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 500, color: "#5A7A5A" }}>{t("oc_applied_status", lang)} {myApplication.status}</div>
                    <div style={{ marginTop: 12, padding: 16, background: "rgba(90,122,90,0.04)", border: "1px solid rgba(90,122,90,0.15)" }}>
                      <p style={{ fontFamily: F, fontSize: 12, color: "#5A7A5A", lineHeight: 1.5, margin: 0, fontWeight: 300 }}>{t("oc_application_submitted", lang)}</p>
                    </div>
                    {openCall.isExternal && (
                      <div style={{ marginTop: 12, padding: 12, border: "1px solid #E8E3DB", background: "#FAF8F4" }}>
                        <p style={{ margin: 0, fontFamily: F, fontSize: 11, color: "#6A6660", lineHeight: 1.5 }}>
                          {emailSent || outreachResult?.sent
                            ? (lang === "ko"
                              ? `외부 갤러리(${outreachResult?.targetEmail || openCall.externalEmail || "이메일"})로 자동 아웃리치 메일을 보냈습니다.`
                              : `Auto outreach email was sent to the external gallery (${outreachResult?.targetEmail || openCall.externalEmail || ""}).`)
                            : outreachResult?.instagram
                              ? (lang === "ko"
                                ? "이 갤러리의 이메일이 없어 자동 발송이 되지 않았습니다. 아래 인스타그램으로 직접 연락해보세요."
                                : "No email found for this gallery. You can reach them directly via Instagram.")
                              : facts?.canEmailOrganizer === false
                                ? (lang === "ko"
                                  ? "주최자에게는 보내지 않았습니다. 접수는 주최 페이지나 전재 글에서 진행하세요."
                                  : "Nothing was sent to the organizer. Apply from the organizer page or the republished notice.")
                                : (lang === "ko"
                                ? "외부 갤러리 이메일이 없어 자동 메일을 보내지 못했습니다. 직접 갤러리 웹사이트를 통해 연락해보세요."
                                : "No email found for this gallery. Please contact them directly via their website.")}
                        </p>
                        {!outreachResult?.sent && outreachResult?.instagram && (
                          <a
                            href={outreachResult.instagram}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "7px 14px", border: "1px solid #C8B4A0", background: "#FFFFFF", color: "#4A4A4A", fontFamily: F, fontSize: 11, letterSpacing: "0.06em", textDecoration: "none", textTransform: "uppercase" }}
                          >
                            Instagram →
                          </a>
                        )}
                      </div>
                    )}
                    {myApplication.shippingStatus !== "pending" && (
                      <div style={{ fontFamily: F, marginTop: 8, fontSize: 12, color: "#8A8580" }}>{t("oc_shipping", lang)}: {myApplication.shippingStatus}</div>
                    )}
                    {myApplication.shippingStatus === "pending" && (
                      <div style={{ marginTop: 16 }}>
                        <button
                          onClick={() => setShowShipping(!showShipping)}
                          style={{ background: "transparent", border: "1px solid #E8E3DB", padding: "10px 20px", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "#8A8580", cursor: "pointer", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}
                        >
                          <span style={{ fontSize: 14 }}>{showShipping ? "\u25B4" : "\u25BE"}</span>
                          {showShipping ? t("oc_hide_shipping", lang) : t("oc_add_shipping", lang)}
                        </button>
                        {showShipping && (
                          <div style={{ marginTop: 12, display: "grid", gap: 12, padding: 20, border: "1px solid #E8E3DB", background: "rgba(232,227,219,0.15)" }}>
                            <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", margin: "0 0 4px", fontWeight: 300 }}>{t("oc_shipping_note", lang)}</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <input value={shipCarrier} onChange={(e) => setShipCarrier(e.target.value)} placeholder={t("oc_carrier", lang)} style={inp} />
                              <input value={shipTrackingNumber} onChange={(e) => setShipTrackingNumber(e.target.value)} placeholder={t("oc_tracking_number", lang)} style={inp} />
                            </div>
                            <input value={shipTrackingUrl} onChange={(e) => setShipTrackingUrl(e.target.value)} placeholder={t("oc_tracking_url", lang)} style={inp} />
                            <input value={shipNote} onChange={(e) => setShipNote(e.target.value)} placeholder={t("oc_shipping_memo", lang)} style={inp} />
                            <button onClick={markShipped} disabled={shipSaving} style={btn(shipSaving)}>{shipSaving ? "..." : t("oc_mark_shipped", lang)}</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <button type="button" onClick={() => setApplyMessage(buildApplyTemplate(lang, openCall.gallery, openCall.theme, "short"))} style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", padding: "6px 10px", cursor: "pointer" }}>
                        {t("oc_tpl_short", lang)}
                      </button>
                      <button type="button" onClick={() => setApplyMessage(buildApplyTemplate(lang, openCall.gallery, openCall.theme, "portfolio"))} style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", padding: "6px 10px", cursor: "pointer" }}>
                        {t("oc_tpl_portfolio", lang)}
                      </button>
                      <button type="button" onClick={() => setApplyMessage(buildApplyTemplate(lang, openCall.gallery, openCall.theme, "local"))} style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", padding: "6px 10px", cursor: "pointer" }}>
                        {t("oc_tpl_local", lang)}
                      </button>
                    </div>
                    <textarea value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} placeholder={t("oc_write_message", lang)} rows={4} style={{ ...inp, resize: "vertical" }} />
                    <button onClick={applyToOpenCall} disabled={applying} style={{ ...btn(applying), marginTop: 12 }}>
                      {applying ? "..." : t("oc_submit_application", lang)}
                    </button>
                  </div>
                )}
                </div>
                )}
              </div>
            )}

            {/* Gallery applications */}
            {isOwner && (
              <div style={{ marginTop: 36, borderTop: "1px solid #E8E3DB", paddingTop: 28 }}>
                <h3 style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A", margin: "0 0 16px" }}>{t("oc_applications", lang)}</h3>
                {loadingApps ? <p style={{ fontFamily: F, color: "#B0AAA2" }}>{t("loading", lang)}</p>
                : applications.length === 0 ? <p style={{ fontFamily: F, color: "#B0AAA2" }}>{t("oc_no_applications", lang)}</p>
                : (
                  <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
                    {applications.map((a) => (
                      <div key={a.id} style={{ padding: 24, background: "#FDFBF7" }}>
                        <div style={{ fontFamily: S, fontWeight: 400, color: "#1A1A1A", fontSize: 18 }}>{a.artistName}</div>
                        <div style={{ fontFamily: F, marginTop: 4, fontSize: 12, color: "#8A8580" }}>{a.artistCity}, {a.artistCountry} &middot; {a.artistEmail}</div>
                        {a.message && <div style={{ fontFamily: F, marginTop: 12, fontSize: 13, color: "#4A4A4A", padding: 12, background: "#FFF", border: "1px solid #E8E3DB", fontWeight: 300 }}>{a.message}</div>}
                        <div style={{ fontFamily: F, marginTop: 12, fontSize: 11, color: "#B0AAA2" }}>{t("status", lang)}: {a.status} &middot; {t("oc_shipping", lang)}: {a.shippingStatus}</div>
                        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {a.artistPortfolioUrl && (
                            <a
                              href={`/api/portfolio?id=${encodeURIComponent(a.artistId)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ padding: "8px 16px", background: "#1A1A1A", color: "#FFF", fontFamily: F, fontWeight: 500, textDecoration: "none", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}
                            >
                              {t("oc_portfolio", lang)}
                            </a>
                          )}
                          <button onClick={() => updateAppStatus(a.id, "reviewing")} disabled={statusUpdatingId === a.id} style={{ padding: "8px 14px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, cursor: "pointer" }}>{t("oc_reviewing", lang)}</button>
                          <button onClick={() => updateAppStatus(a.id, "accepted")} disabled={statusUpdatingId === a.id} style={{ padding: "8px 14px", border: "none", background: "#5A7A5A", color: "#FFF", fontFamily: F, fontSize: 10, cursor: "pointer" }}>{t("oc_accept", lang)}</button>
                          <button onClick={() => updateAppStatus(a.id, "rejected")} disabled={statusUpdatingId === a.id} style={{ padding: "8px 14px", border: "1px solid #8B4A4A", background: "transparent", color: "#8B4A4A", fontFamily: F, fontSize: 10, cursor: "pointer" }}>{t("oc_reject", lang)}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>{/* end padding wrapper */}
          </div>
        )}
      </main>
    </>
  );
}
