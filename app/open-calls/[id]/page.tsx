"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import OpenCallPoster from "@/app/components/OpenCallPoster";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";

type Role = "artist" | "gallery";
type MeResponse = { session: { userId: string; role: Role; email?: string } | null; profile: any | null };
type OpenCall = { id: string; galleryId: string; gallery: string; city: string; country: string; theme: string; deadline: string; posterImage?: string | null; isExternal?: boolean; externalEmail?: string; externalUrl?: string; galleryWebsite?: string; galleryDescription?: string };
type Application = { id: string; openCallId: string; galleryId: string; artistId: string; artistName: string; artistEmail: string; artistCountry: string; artistCity: string; artistPortfolioUrl?: string; message?: string; status: "submitted" | "reviewing" | "accepted" | "rejected"; shippingStatus: "pending" | "shipped" | "received" | "inspected" | "exhibited"; shippingNote?: string; shippingCarrier?: string; trackingNumber?: string; trackingUrl?: string; createdAt: number; updatedAt: number };

async function fetchMe(): Promise<MeResponse | null> { try { const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" }); return (await res.json().catch(() => null)) as MeResponse | null; } catch { return null; } }

const inp: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#1A1A1A", fontFamily: F, fontSize: 13, outline: "none" };
const btn = (disabled: boolean): React.CSSProperties => ({ padding: "14px 28px", border: "none", background: disabled ? "#E8E3DB" : "#1A1A1A", color: disabled ? "#8A8580" : "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer" });

function hostFromUrl(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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

  async function translateText(text: string, targetLang: string): Promise<string | null> {
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, targetLang }) });
      const data = await res.json();
      return data.ok && data.translated ? data.translated : null;
    } catch { return null; }
  }

  async function translateTheme() { if (!openCall?.theme) return; if (translatedTheme) { setShowTranslation(!showTranslation); return; } setTranslating(true); try { const translated = await translateText(openCall.theme, lang); if (translated) { setTranslatedTheme(translated); setShowTranslation(true); } if (openCall.galleryDescription) { const descTranslated = await translateText(openCall.galleryDescription, lang); if (descTranslated) setTranslatedDesc(descTranslated); } } catch (e) { console.error(e); } finally { setTranslating(false); } }

  // Auto-translate when language is not English and open call loads
  useEffect(() => {
    if (!openCall || lang === "en" || translatedTheme) return;
    (async () => {
      setTranslating(true);
      try {
        const [themeResult, descResult] = await Promise.all([
          openCall.theme ? translateText(openCall.theme, lang) : Promise.resolve(null),
          openCall.galleryDescription ? translateText(openCall.galleryDescription, lang) : Promise.resolve(null),
        ]);
        if (themeResult) { setTranslatedTheme(themeResult); setShowTranslation(true); }
        if (descResult) setTranslatedDesc(descResult);
      } catch (e) { console.error(e); }
      finally { setTranslating(false); }
    })();
  }, [openCall?.id, lang]);

  useEffect(() => { (async () => { setMe(await fetchMe()); })(); }, []);
  useEffect(() => { (async () => { try { setError(null); setLoading(true); const res = await fetch(`/api/open-calls/${params.id}`, { cache: "no-store", credentials: "include" }); const data = await res.json().catch(() => null); if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`); setOpenCall((data?.openCall ?? null) as OpenCall | null); } catch (e: any) { setOpenCall(null); setError(e?.message ?? "Failed to load"); } finally { setLoading(false); } })(); }, [params.id]);

  useEffect(() => { if (!openCall || !me?.session) return; const session = me.session; (async () => { try { setLoadingApps(true); const res = await fetch(`/api/applications?openCallId=${openCall.id}`, { cache: "no-store", credentials: "include" }); const data = await res.json().catch(() => null); if (!res.ok) { setApplications([]); setMyApplication(null); return; } const list = Array.isArray(data?.applications) ? data.applications : []; if (session.role === "artist") { setMyApplication(list[0] ?? null); setApplications([]); } else if (session.role === "gallery") { setApplications(session.userId === openCall.galleryId ? list : []); setMyApplication(null); } } finally { setLoadingApps(false); } })(); }, [openCall?.id, me?.session?.userId]);

  useEffect(() => { if (!myApplication) return; setShipNote(myApplication.shippingNote ?? ""); setShipCarrier(myApplication.shippingCarrier ?? ""); setShipTrackingNumber(myApplication.trackingNumber ?? ""); setShipTrackingUrl(myApplication.trackingUrl ?? ""); }, [myApplication?.id]);

  async function contactGallery() { if (!openCall) return; setContacting(true); setError(null); try { const m = me ?? (await fetchMe()); if (!m?.session) { router.push("/login"); return; } if (m.session.role !== "artist") throw new Error("Artists only"); const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ openCallId: openCall.id, galleryId: openCall.galleryId }) }); const data = await res.json().catch(() => null); if (!res.ok || !data?.roomId) throw new Error(data?.error ?? "Failed"); router.push(`/chat/${data.roomId}`); } catch (e: any) { setError(e?.message ?? "Failed"); } finally { setContacting(false); } }

  async function applyToOpenCall() { if (!openCall) return; setApplying(true); setError(null); try { const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ openCallId: openCall.id, message: applyMessage.trim() || undefined }) }); const data = await res.json().catch(() => null); if (!res.ok || !data?.application) throw new Error(data?.error ?? "Failed"); setMyApplication(data.application as Application); if (data.emailSent) setEmailSent(true); } catch (e: any) { setError(e?.message ?? "Failed"); } finally { setApplying(false); } }

  async function markShipped() { if (!myApplication) return; setShipSaving(true); setError(null); try { const res = await fetch(`/api/applications/${myApplication.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ shippingStatus: "shipped", shippingNote: shipNote.trim() || undefined, shippingCarrier: shipCarrier.trim() || undefined, trackingNumber: shipTrackingNumber.trim() || undefined, trackingUrl: shipTrackingUrl.trim() || undefined }) }); const data = await res.json().catch(() => null); if (!res.ok || !data?.application) throw new Error(data?.error ?? "Failed"); setMyApplication(data.application as Application); } catch (e: any) { setError(e?.message ?? "Failed"); } finally { setShipSaving(false); } }

  async function updateAppStatus(id: string, status: string) { setStatusUpdatingId(id); try { const res = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status }) }); const data = await res.json().catch(() => null); if (res.ok && data?.application) setApplications((p) => p.map((a) => a.id === id ? (data.application as Application) : a)); } finally { setStatusUpdatingId(null); } }
  async function updateShipStatus(id: string, shippingStatus: string) { setStatusUpdatingId(id); try { const res = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ shippingStatus }) }); const data = await res.json().catch(() => null); if (res.ok && data?.application) setApplications((p) => p.map((a) => a.id === id ? (data.application as Application) : a)); } finally { setStatusUpdatingId(null); } }

  const role = me?.session?.role ?? null;
  const canContact = role === "artist";
  const isOwner = role === "gallery" && me?.session?.userId === openCall?.galleryId;

  return (
    <>
      <TopBar />
      <main style={{ padding: "48px 40px", maxWidth: 860, margin: "0 auto" }}>
        <button onClick={() => router.back()} style={{ marginBottom: 28, background: "transparent", border: "none", color: "#8A8580", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", cursor: "pointer" }}>
          &larr; {t("back", lang)}
        </button>

        {loading ? <p style={{ fontFamily: F, color: "#B0AAA2" }}>{t("loading", lang)}</p>
        : error ? <div style={{ padding: 20, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>{error}</div>
        : !openCall ? <p style={{ fontFamily: F, color: "#B0AAA2" }}>Not found</p>
        : (
          <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", overflow: "hidden" }}>
            {/* Hero Poster */}
            <OpenCallPoster
              posterImage={openCall.posterImage}
              gallery={openCall.gallery}
              theme={openCall.theme}
              city={openCall.city}
              country={openCall.country}
              deadline={openCall.deadline}
              hero
            />

            <div style={{ padding: 40 }}>
            <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>
              {openCall.country} / {openCall.city}
            </span>

            <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 400, color: "#1A1A1A", margin: "8px 0 0" }}>
              {openCall.gallery}
            </h1>

            {(openCall.galleryWebsite || openCall.externalUrl) && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {openCall.galleryWebsite && (
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
                    {t("oc_source", lang)}
                  </a>
                )}
              </div>
            )}

            {openCall.galleryDescription && (
              <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", marginTop: 12, lineHeight: 1.7, fontWeight: 300 }}>
                {showTranslation && translatedDesc ? translatedDesc : openCall.galleryDescription}
              </p>
            )}

            <div style={{ marginTop: 28, display: "grid", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", color: "#B0AAA2", textTransform: "uppercase" }}>{t("oc_theme", lang)}</span>
                  <div style={{ marginTop: 4 }}>
                    {showTranslation && translatedTheme ? (
                      <><div style={{ fontFamily: S, fontSize: 22, fontWeight: 400, color: "#8B7355" }}>{translatedTheme}</div><div style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", fontStyle: "italic", marginTop: 4 }}>{t("oc_original_text", lang)}: {openCall.theme}</div></>
                    ) : (
                      <div style={{ fontFamily: S, fontSize: 22, fontWeight: 400, color: "#1A1A1A" }}>{openCall.theme}</div>
                    )}
                  </div>
                </div>
                <button onClick={translateTheme} disabled={translating} style={{ ...inp, width: "auto", padding: "6px 14px", fontSize: 10, color: "#8A8580", cursor: translating ? "wait" : "pointer", whiteSpace: "nowrap" }}>
                  {translating ? "..." : showTranslation ? t("oc_show_original", lang) : t("oc_show_translation", lang)}
                </button>
              </div>

              <div>
                <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", color: "#B0AAA2", textTransform: "uppercase" }}>{t("deadline", lang)}</span>
                <div style={{ fontFamily: S, fontSize: 22, fontWeight: 400, color: "#1A1A1A", marginTop: 4 }}>{openCall.deadline}</div>
              </div>

            </div>

            {/* Actions */}
            <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              {canContact && !openCall.isExternal && <button onClick={contactGallery} disabled={contacting} style={btn(contacting)}>{contacting ? "..." : t("oc_contact_gallery", lang)}</button>}
              <button onClick={() => router.push("/open-calls")} style={{ ...btn(false), background: "transparent", color: "#8A8580", border: "1px solid #E8E3DB" }}>{t("oc_back_to_list", lang)}</button>
            </div>

            {/* Artist apply */}
            {role === "artist" && (
              <div style={{ marginTop: 36, borderTop: "1px solid #E8E3DB", paddingTop: 28 }}>
                <h3 style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A", margin: "0 0 8px" }}>
                  {t("oc_apply_to", lang)}
                </h3>

                {myApplication ? (
                  <div>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 500, color: "#5A7A5A" }}>{t("oc_applied_status", lang)} {myApplication.status}</div>
                    <div style={{ marginTop: 12, padding: 16, background: "rgba(90,122,90,0.04)", border: "1px solid rgba(90,122,90,0.15)" }}>
                      <p style={{ fontFamily: F, fontSize: 12, color: "#5A7A5A", lineHeight: 1.5, margin: 0, fontWeight: 300 }}>{t("oc_application_submitted", lang)}</p>
                    </div>
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
                    <textarea value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} placeholder={t("oc_write_message", lang)} rows={4} style={{ ...inp, resize: "vertical" }} />
                    <button onClick={applyToOpenCall} disabled={applying} style={{ ...btn(applying), marginTop: 12 }}>
                      {applying ? "..." : t("oc_submit_application", lang)}
                    </button>
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
                          {a.artistPortfolioUrl && <a href={a.artistPortfolioUrl} target="_blank" rel="noreferrer" style={{ padding: "8px 16px", background: "#1A1A1A", color: "#FFF", fontFamily: F, fontWeight: 500, textDecoration: "none", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("oc_portfolio", lang)}</a>}
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
