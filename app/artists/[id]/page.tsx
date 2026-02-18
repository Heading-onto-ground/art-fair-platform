"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { LANGUAGE_NAMES, type SupportedLang } from "@/lib/translateApi";
import { F } from "@/lib/design";

type ArtistProfile = {
  id: string;
  userId: string;
  role: "artist";
  email: string;
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  portfolioUrl?: string;
  createdAt: number;
  updatedAt: number;
};

type PublicArtistResponse =
  | { ok: true; profile: ArtistProfile }
  | { ok: false; error: string };

type Role = "artist" | "gallery";
type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

type OpenCall = {
  id: string;
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
};

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "dark" | "soft";
}) {
  const styles =
    tone === "dark"
      ? { background: "#111", color: "#fff", border: "1px solid #111" }
      : tone === "soft"
      ? { background: "#f5f5f5", color: "#111", border: "1px solid #eee" }
      : { background: "#fff", color: "#111", border: "1px solid #ddd" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: 1,
        ...styles,
      }}
    >
      {children}
    </span>
  );
}

export default function PublicArtistPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([]);
  const [selectedOpenCallId, setSelectedOpenCallId] = useState<string>("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // 번역 관련 상태
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [showBioTranslation, setShowBioTranslation] = useState(false);
  const [translatingBio, setTranslatingBio] = useState(false);
  const [portfolioViewerUrl, setPortfolioViewerUrl] = useState<string | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  async function openPortfolio(url?: string) {
    setPortfolioError(null);
    const userId = String(profile?.userId || "").trim();
    if (userId) {
      window.location.assign(`/api/artist-portfolio/${encodeURIComponent(userId)}`);
      return;
    }
    const v = String(url || "").trim();
    if (!v) return;
    if (/^data:/i.test(v)) {
      try {
        // `fetch(data:...)` is more robust than manual atob for large base64 payloads.
        const res = await fetch(v);
        const blob = await res.blob();
        if (!blob || blob.size === 0) {
          setPortfolioError("포트폴리오를 불러오지 못했습니다.");
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        setPortfolioViewerUrl(blobUrl);
      } catch {
        setPortfolioError("포트폴리오 열기에 실패했습니다.");
      }
      return;
    }
    // Always use in-page viewer to avoid popup/new-tab blocking policies.
    setPortfolioViewerUrl(v);
  }

  async function downloadPortfolio(url?: string, filename = "portfolio.pdf") {
    setPortfolioError(null);
    const userId = String(profile?.userId || "").trim();
    if (userId) {
      const a = document.createElement("a");
      a.href = `/api/artist-portfolio/${encodeURIComponent(userId)}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    const v = String(url || "").trim();
    if (!v) return;
    if (v.startsWith("data:")) {
      try {
        const res = await fetch(v);
        const blob = await res.blob();
        if (!blob || blob.size === 0) {
          setPortfolioError("포트폴리오를 불러오지 못했습니다.");
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch {
        setPortfolioError("포트폴리오 다운로드에 실패했습니다.");
      }
      return;
    }
    const a = document.createElement("a");
    a.href = v;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function translateBio() {
    if (!profile?.bio) return;
    if (translatedBio) {
      setShowBioTranslation(!showBioTranslation);
      return;
    }

    setTranslatingBio(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: profile.bio, targetLang: lang }),
      });
      const data = await res.json();
      if (data.ok && data.translated) {
        setTranslatedBio(data.translated);
        setShowBioTranslation(true);
      }
    } catch (e) {
      console.error("Translation failed:", e);
    } finally {
      setTranslatingBio(false);
    }
  }

  const load = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/artist/${encodeURIComponent(id)}`, {
        cache: "default",
      });

      const json = (await res.json().catch(() => null)) as PublicArtistResponse | null;

      if (!res.ok || !json || (json as any).ok === false) {
        setProfile(null);
        setError((json as any)?.error ?? `not found (${res.status})`);
        setLoading(false);
        return;
      }

      setProfile((json as any).profile);
    } catch {
      setError("network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me?lite=1", { cache: "default", credentials: "include" });
      const data = (await res.json().catch(() => null)) as MeResponse | null;
      setMe(data);

      if (data?.session?.role === "gallery") {
        const ocRes = await fetch("/api/open-calls", { cache: "default" });
        const ocData = await ocRes.json().catch(() => null);
        const all = Array.isArray(ocData?.openCalls) ? ocData.openCalls : [];
        const mine = all.filter((o: OpenCall) => o.galleryId === data.session!.userId);
        setOpenCalls(mine);
        if (mine.length > 0) setSelectedOpenCallId(mine[0].id);
      } else {
        setOpenCalls([]);
        setSelectedOpenCallId("");
      }
    })();
  }, []);

  async function inviteArtist() {
    if (!profile || !selectedOpenCallId) {
      setInviteError("오픈콜을 선택해주세요.");
      return;
    }
    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/chat/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          openCallId: selectedOpenCallId,
          artistId: profile.userId,
          message: inviteMessage.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.roomId) {
        throw new Error(data?.error ?? `Failed to invite (${res.status})`);
      }
      router.push(`/chat/${String(data.roomId)}`);
    } catch (e: any) {
      setInviteError(e?.message ?? "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  // 대화 보내기 (오픈콜 선택 후 채팅 시작)
  async function startChat() {
    if (!profile || !selectedOpenCallId) {
      setChatError("오픈콜을 선택해주세요.");
      return;
    }
    setStartingChat(true);
    setChatError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          openCallId: selectedOpenCallId,
          artistId: profile.userId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.roomId) {
        throw new Error(data?.error ?? `Failed to start chat (${res.status})`);
      }
      router.push(`/chat/${String(data.roomId)}`);
    } catch (e: any) {
      setChatError(e?.message ?? "Failed to start chat");
    } finally {
      setStartingChat(false);
    }
  }

  return (
    <>
      <TopBar />

      <main style={{ maxWidth: 860, margin: "40px auto", padding: "0 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            🧑‍🎨 Artist Public Profile
          </h1>

          <button
            onClick={() => router.back()}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
          Public view. Share this URL with galleries.
        </div>

        {loading ? (
          <div style={{ padding: 14, opacity: 0.7 }}>Loading…</div>
        ) : error ? (
          <div
            style={{
              marginTop: 14,
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18 }}>❓ Not found</div>
            <div style={{ marginTop: 8, opacity: 0.75 }}>
              {error === "not found" ? "Artist profile not found." : error}
            </div>

            <div style={{ marginTop: 12 }}>
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                  fontWeight: 900,
                  border: "1px solid #eee",
                  background: "#fafafa",
                  padding: "8px 10px",
                  borderRadius: 12,
                  color: "#111",
                }}
              >
                🏠 Home <span style={{ opacity: 0.6 }}>↗</span>
              </Link>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 14,
              border: "1px solid #e6e6e6",
              borderRadius: 18,
              background: "#fff",
              padding: 16,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: -0.3 }}>
                  {profile?.name?.trim() ? profile.name : "Unnamed Artist"}
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Chip>📍 {profile?.city || "-"}</Chip>
                  <Chip>🌍 {profile?.country || "-"}</Chip>
                  <Chip tone="soft">ID: {profile?.userId}</Chip>
                </div>
              </div>

              <Chip tone="dark">ARTIST</Chip>
            </div>

            {/* Bio */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>
                  Bio
                </div>
                {profile?.bio?.trim() && (
                  <button
                    onClick={translateBio}
                    disabled={translatingBio}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      background: showBioTranslation ? "#e8e8ff" : "#f5f5f5",
                      fontSize: 11,
                      color: "#666",
                      cursor: translatingBio ? "wait" : "pointer",
                    }}
                  >
                    {translatingBio ? "..." : showBioTranslation ? "원문" : `🌐 ${LANGUAGE_NAMES[lang as SupportedLang] || lang}`}
                  </button>
                )}
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 14,
                  background: "#fafafa",
                  border: "1px solid #eee",
                  whiteSpace: "pre-wrap",
                }}
              >
                {showBioTranslation && translatedBio ? (
                  <>
                    <div style={{ color: "#6366f1" }}>{translatedBio}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#999", fontStyle: "italic", borderTop: "1px dashed #ddd", paddingTop: 8 }}>
                      원문: {profile?.bio}
                    </div>
                  </>
                ) : (
                  profile?.bio?.trim() ? profile.bio : "No bio yet."
                )}
              </div>
            </div>

            {/* Links */}
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>
                  Website
                </div>
                {profile?.website ? (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 8,
                      fontWeight: 900,
                      textDecoration: "none",
                      color: "#111",
                    }}
                  >
                    🔗 {profile.website} <span style={{ opacity: 0.6 }}>↗</span>
                  </a>
                ) : (
                  <div style={{ marginTop: 8, opacity: 0.7 }}>No website</div>
                )}
              </div>

              <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>
                  Portfolio (PDF)
                </div>

                {profile?.portfolioUrl ? (
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        openPortfolio(profile.portfolioUrl);
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid #111",
                        background: "#111",
                        color: "#fff",
                        fontWeight: 900,
                        textDecoration: "none",
                        cursor: "pointer",
                      }}
                    >
                      📄 Open PDF
                    </button>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        downloadPortfolio(profile.portfolioUrl, `${profile.name || "artist"}-portfolio.pdf`);
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid #ddd",
                        background: "#fff",
                        fontWeight: 900,
                        textDecoration: "none",
                        color: "#111",
                        cursor: "pointer",
                      }}
                    >
                      ⬇️ Download
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 8, opacity: 0.7 }}>No portfolio uploaded</div>
                )}
                {portfolioError && (
                  <div style={{ marginTop: 8, color: "#8B4A4A", fontSize: 12, fontFamily: F }}>
                    {portfolioError}
                  </div>
                )}
              </div>
            </div>

            {me?.session?.role === "gallery" ? (
              <div
                style={{
                  marginTop: 16,
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: 12,
                  background: "#fafafa",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 900 }}>
                  📨 Invite to Open Call
                </div>
                {openCalls.length === 0 ? (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                    등록된 오픈콜이 없습니다. 먼저 오픈콜을 등록해주세요.
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedOpenCallId}
                      onChange={(e) => setSelectedOpenCallId(e.target.value)}
                      style={{
                        marginTop: 8,
                        padding: 8,
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "#fff",
                        width: "100%",
                      }}
                    >
                      {openCalls.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.country} {o.city} · {o.theme} (#{o.id})
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Invite message (optional)"
                      rows={3}
                      style={{
                        marginTop: 8,
                        width: "100%",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        resize: "vertical",
                      }}
                    />
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={inviteArtist}
                        disabled={inviting}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 10,
                          border: "1px solid #111",
                          background: "#111",
                          color: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        {inviting ? "Sending..." : "📨 Send Invite"}
                      </button>
                      <button
                        onClick={startChat}
                        disabled={startingChat}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 10,
                          border: "1px solid #6366f1",
                          background: "#6366f1",
                          color: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        {startingChat ? "..." : "💬 대화 보내기"}
                      </button>
                    </div>
                    {(inviteError || chatError) ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#b00" }}>
                        {inviteError || chatError}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
              Updated:{" "}
              {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "-"}
            </div>
          </div>
        )}

        {portfolioViewerUrl && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ width: "min(1080px, 96vw)", height: "min(86vh, 900px)", background: "#fff", borderRadius: 14, overflow: "hidden", display: "grid", gridTemplateRows: "52px 1fr" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", borderBottom: "1px solid #EEE", fontFamily: F }}>
                <span style={{ fontSize: 12, color: "#666" }}>Portfolio Preview</span>
                <button
                  onClick={() => {
                    const url = portfolioViewerUrl;
                    setPortfolioViewerUrl(null);
                    window.setTimeout(() => {
                      if (!url) return;
                      try { URL.revokeObjectURL(url); } catch {}
                    }, 0);
                  }}
                  style={{ border: "1px solid #DDD", background: "#FFF", padding: "6px 10px", cursor: "pointer", borderRadius: 8 }}
                >
                  Close
                </button>
              </div>
              <iframe src={portfolioViewerUrl} style={{ width: "100%", height: "100%", border: "none" }} title="Artist portfolio preview" />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
