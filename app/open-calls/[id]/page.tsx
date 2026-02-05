"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { LANGUAGE_NAMES, type SupportedLang } from "@/lib/translateApi";

type Role = "artist" | "gallery";

type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

type OpenCall = {
  id: string;
  galleryId: string; // ✅ "갤러리 로그인 userId" 값이어야 함 (예: gallery_dmx69@naver.com)
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
};

type Application = {
  id: string;
  openCallId: string;
  galleryId: string;
  artistId: string;
  artistName: string;
  artistEmail: string;
  artistCountry: string;
  artistCity: string;
  artistPortfolioUrl?: string;
  message?: string;
  status: "submitted" | "reviewing" | "accepted" | "rejected";
  shippingStatus: "pending" | "shipped" | "received" | "inspected" | "exhibited";
  shippingNote?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: number;
  updatedAt: number;
};

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch {
    return null;
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
  const [shipNote, setShipNote] = useState("");
  const [shipCarrier, setShipCarrier] = useState("");
  const [shipTrackingNumber, setShipTrackingNumber] = useState("");
  const [shipTrackingUrl, setShipTrackingUrl] = useState("");
  const [shipSaving, setShipSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // 번역 관련 상태
  const [translatedTheme, setTranslatedTheme] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);

  // 테마 번역
  async function translateTheme() {
    if (!openCall?.theme) return;
    if (translatedTheme) {
      setShowTranslation(!showTranslation);
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: openCall.theme, targetLang: lang }),
      });
      const data = await res.json();
      if (data.ok && data.translated) {
        setTranslatedTheme(data.translated);
        setShowTranslation(true);
      }
    } catch (e) {
      console.error("Translation failed:", e);
    } finally {
      setTranslating(false);
    }
  }

  // 1) 세션 미리 로드 (버튼 활성/비활성 및 role 체크용)
  useEffect(() => {
    (async () => {
      const m = await fetchMe();
      setMe(m);
    })();
  }, []);

  // 2) OpenCall 상세 로드
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch(`/api/open-calls/${params.id}`, {
          cache: "no-store",
          credentials: "include",
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? `Failed to load (${res.status})`);
        }

        setOpenCall((data?.openCall ?? null) as OpenCall | null);
      } catch (e: any) {
        setOpenCall(null);
        setError(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  // 3) 신청/지원 목록 로드
  useEffect(() => {
    if (!openCall || !me?.session?.userId || !me?.session?.role) return;

    const session = me?.session;
    if (!session) return;

    (async () => {
      try {
        setLoadingApps(true);
        const res = await fetch(`/api/applications?openCallId=${openCall.id}`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setApplications([]);
          setMyApplication(null);
          return;
        }
        const list = Array.isArray(data?.applications) ? data.applications : [];
        if (session.role === "artist") {
          setMyApplication(list[0] ?? null);
          setApplications([]);
        } else if (session.role === "gallery") {
          // 갤러리는 자기 오픈콜일 때만 목록 노출
          if (session.userId === openCall.galleryId) {
            setApplications(list);
          } else {
            setApplications([]);
          }
          setMyApplication(null);
        }
      } finally {
        setLoadingApps(false);
      }
    })();
  }, [openCall?.id, me?.session?.userId, me?.session?.role]);

  useEffect(() => {
    if (!myApplication) return;
    setShipNote(myApplication.shippingNote ?? "");
    setShipCarrier(myApplication.shippingCarrier ?? "");
    setShipTrackingNumber(myApplication.trackingNumber ?? "");
    setShipTrackingUrl(myApplication.trackingUrl ?? "");
  }, [myApplication?.id]);

  // ✅ 채팅 생성 (artist만 가능)
  async function contactGallery() {
    if (!openCall) return;

    setContacting(true);
    setError(null);

    try {
      const m = me ?? (await fetchMe());
      const session = m?.session;

      if (!session) {
        router.push("/login");
        return;
      }

      if (session.role !== "artist") {
        throw new Error("아티스트만 갤러리에 문의할 수 있어요.");
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          openCallId: openCall.id,
          galleryId: openCall.galleryId, // ✅ openCalls.ts에서 "gallery_dmx69@naver.com"로 통일되어 있어야 함
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.roomId) {
        throw new Error(data?.error ?? `Failed to create chat (${res.status})`);
      }

      router.push(`/chat/${String(data.roomId)}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to contact gallery");
    } finally {
      setContacting(false);
    }
  }

  const role = me?.session?.role ?? null;
  const canContact = role === "artist";
  const isOwnerGallery = role === "gallery" && me?.session?.userId === openCall?.galleryId;

  async function applyToOpenCall() {
    if (!openCall) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          openCallId: openCall.id,
          message: applyMessage.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.application) {
        throw new Error(data?.error ?? `Failed to apply (${res.status})`);
      }
      setMyApplication(data.application as Application);
    } catch (e: any) {
      setError(e?.message ?? "Failed to apply");
    } finally {
      setApplying(false);
    }
  }

  async function markShipped() {
    if (!myApplication) return;
    setShipSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${myApplication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          shippingStatus: "shipped",
          shippingNote: shipNote.trim() || undefined,
          shippingCarrier: shipCarrier.trim() || undefined,
          trackingNumber: shipTrackingNumber.trim() || undefined,
          trackingUrl: shipTrackingUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.application) {
        throw new Error(data?.error ?? `Failed to update shipping (${res.status})`);
      }
      setMyApplication(data.application as Application);
      setShipNote("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to update shipping");
    } finally {
      setShipSaving(false);
    }
  }

  async function updateApplicationStatus(appId: string, status: Application["status"]) {
    setStatusUpdatingId(appId);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.application) {
        throw new Error(data?.error ?? `Failed to update (${res.status})`);
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? (data.application as Application) : a))
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function updateShippingStatus(appId: string, shippingStatus: Application["shippingStatus"]) {
    setStatusUpdatingId(appId);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ shippingStatus }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.application) {
        throw new Error(data?.error ?? `Failed to update (${res.status})`);
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? (data.application as Application) : a))
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to update shipping status");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return (
    <>
      <TopBar />
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => router.back()} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <div
          style={{
            border: "1px solid rgba(255,80,80,0.5)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <b>Error:</b> {error}
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button onClick={() => router.push("/login")}>Go to Login</button>
            <button onClick={() => router.refresh()}>Refresh</button>
          </div>
        </div>
      ) : !openCall ? (
        <p>Not found</p>
      ) : (
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 14,
            padding: 16,
            background: "#fff",
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 900 }}>
            {openCall.country} {openCall.city}
          </h1>

          <p style={{ marginTop: 8, opacity: 0.9 }}>
            <Link
              href={`/galleries/${encodeURIComponent(openCall.galleryId)}`}
              style={{ fontWeight: 800, textDecoration: "underline", color: "inherit" }}
            >
              {openCall.gallery}
            </Link>{" "}
            is calling artists.
          </p>

          <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span>Theme: </span>
                {showTranslation && translatedTheme ? (
                  <>
                    <b style={{ color: "#6366f1" }}>{translatedTheme}</b>
                    <div style={{ fontSize: 12, color: "#999", fontStyle: "italic", marginTop: 2 }}>
                      원문: {openCall.theme}
                    </div>
                  </>
                ) : (
                  <b>{openCall.theme}</b>
                )}
              </div>
              <button
                onClick={translateTheme}
                disabled={translating}
                style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: showTranslation ? "#e8e8ff" : "#f5f5f5",
                  fontSize: 11,
                  color: "#666",
                  cursor: translating ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {translating ? "..." : showTranslation ? "원문" : `🌐 ${LANGUAGE_NAMES[lang as SupportedLang] || lang}`}
              </button>
            </div>
            <div>Deadline: {openCall.deadline}</div>
            <div style={{ opacity: 0.7 }}>OpenCall ID: {openCall.id}</div>
            <div style={{ opacity: 0.7 }}>Gallery ID: {openCall.galleryId}</div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
            {canContact ? (
              <button
                onClick={contactGallery}
                disabled={contacting}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                {contacting ? "Creating chat…" : "Contact gallery 💬"}
              </button>
            ) : (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "rgba(0,0,0,0.03)",
                  fontWeight: 800,
                  opacity: 0.8,
                }}
              >
                Gallery accounts can’t contact galleries.
              </div>
            )}

            <button
              onClick={() => router.push("/open-calls")}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              Back to list
            </button>
          </div>

          {role === "artist" ? (
            <div
              style={{
                marginTop: 16,
                borderTop: "1px dashed rgba(0,0,0,0.1)",
                paddingTop: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
                Apply to this Open Call
              </h3>

              {myApplication ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 800 }}>
                    ✅ Applied · Status: {myApplication.status}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
                    Shipping: {myApplication.shippingStatus}
                  </div>

                  {myApplication.shippingStatus === "pending" ? (
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                        <input
                          value={shipCarrier}
                          onChange={(e) => setShipCarrier(e.target.value)}
                          placeholder="Shipping carrier (e.g., DHL)"
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(0,0,0,0.16)",
                          }}
                        />
                        <input
                          value={shipTrackingNumber}
                          onChange={(e) => setShipTrackingNumber(e.target.value)}
                          placeholder="Tracking number"
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(0,0,0,0.16)",
                          }}
                        />
                      </div>
                      <input
                        value={shipTrackingUrl}
                        onChange={(e) => setShipTrackingUrl(e.target.value)}
                        placeholder="Tracking URL (optional)"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.16)",
                        }}
                      />
                      <input
                        value={shipNote}
                        onChange={(e) => setShipNote(e.target.value)}
                        placeholder="Shipping note (pickup date, insurance...)"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.16)",
                        }}
                      />
                      <button
                        onClick={markShipped}
                        disabled={shipSaving}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #111",
                          background: "#111",
                          color: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        {shipSaving ? "Saving..." : "Mark as Shipped"}
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                      {myApplication.shippingCarrier
                        ? `Carrier: ${myApplication.shippingCarrier}`
                        : "Carrier: -"}
                      {myApplication.trackingNumber
                        ? ` · Tracking: ${myApplication.trackingNumber}`
                        : ""}
                      {myApplication.shippingNote ? ` · Note: ${myApplication.shippingNote}` : ""}
                      {myApplication.trackingUrl ? (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            href={myApplication.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Track shipment →
                          </a>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                    placeholder="Write a short message to the gallery..."
                    rows={4}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.16)",
                      resize: "vertical",
                    }}
                  />
                  <button
                    onClick={applyToOpenCall}
                    disabled={applying}
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #111",
                      background: "#111",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {applying ? "Applying..." : "Submit Application"}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {isOwnerGallery ? (
            <div
              style={{
                marginTop: 16,
                borderTop: "1px dashed rgba(0,0,0,0.1)",
                paddingTop: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
                Applications
              </h3>

              {loadingApps ? (
                <p style={{ marginTop: 10 }}>Loading applications…</p>
              ) : applications.length === 0 ? (
                <p style={{ marginTop: 10, opacity: 0.7 }}>
                  No applications yet.
                </p>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {applications.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        border: "1px solid rgba(0,0,0,0.12)",
                        borderRadius: 12,
                        padding: 12,
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>
                        🎨 {a.artistName} ({a.artistId})
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>
                        {a.artistCity}, {a.artistCountry} · {a.artistEmail}
                      </div>
                      {a.message ? (
                        <div style={{ marginTop: 8 }}>{a.message}</div>
                      ) : null}
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                        Status: {a.status} · Shipping: {a.shippingStatus}
                        {a.shippingCarrier ? ` · Carrier: ${a.shippingCarrier}` : ""}
                        {a.trackingNumber ? ` · Tracking: ${a.trackingNumber}` : ""}
                        {a.shippingNote ? ` · Note: ${a.shippingNote}` : ""}
                      </div>
                      {a.trackingUrl ? (
                        <a
                          href={a.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, textDecoration: "none" }}
                        >
                          Track shipment →
                        </a>
                      ) : null}
                      <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {a.artistPortfolioUrl ? (
                          <a
                            href={a.artistPortfolioUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid #111",
                              background: "#111",
                              color: "#fff",
                              fontWeight: 900,
                              textDecoration: "none",
                              fontSize: 12,
                            }}
                          >
                            View Portfolio
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, opacity: 0.7 }}>
                            No portfolio
                          </span>
                        )}
                        {a.status === "accepted" ? (
                          <>
                            <button
                              onClick={() => updateShippingStatus(a.id, "received")}
                              disabled={statusUpdatingId === a.id}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.2)",
                                background: "#fff",
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              Mark Received
                            </button>
                            <button
                              onClick={() => updateShippingStatus(a.id, "inspected")}
                              disabled={statusUpdatingId === a.id}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.2)",
                                background: "#fff",
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              Mark Inspected
                            </button>
                            <button
                              onClick={() => updateShippingStatus(a.id, "exhibited")}
                              disabled={statusUpdatingId === a.id}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.2)",
                                background: "#fff",
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              Mark Exhibited
                            </button>
                          </>
                        ) : null}
                        <button
                          onClick={() => updateApplicationStatus(a.id, "reviewing")}
                          disabled={statusUpdatingId === a.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(0,0,0,0.2)",
                            background: "#fff",
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Mark Reviewing
                        </button>
                        <button
                          onClick={() => updateApplicationStatus(a.id, "accepted")}
                          disabled={statusUpdatingId === a.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid #111",
                            background: "#111",
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateApplicationStatus(a.id, "rejected")}
                          disabled={statusUpdatingId === a.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(200,0,0,0.5)",
                            background: "rgba(200,0,0,0.06)",
                            color: "#b00",
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <p style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
            Note: Chat creation uses /api/chat. For gallery access to work, each OpenCall.galleryId must equal the
            gallery account’s session.userId (e.g. <b>gallery_dmx69@naver.com</b>).
          </p>
        </div>
      )}
      </div>
    </>
  );
}