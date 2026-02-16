"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { LANGUAGE_NAMES, type SupportedLang } from "@/lib/translateApi";

type Role = "artist" | "gallery";
type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch {
    return null;
  }
}

type GalleryProfile = {
  id: string;
  userId: string;
  role: "gallery";
  email: string;
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  createdAt: number;
  updatedAt: number;
};

type PublicResp =
  | { ok: true; profile: GalleryProfile; exhibitions?: Exhibition[] }
  | { ok: false; error: string };

type Exhibition = {
  id: string;
  title: string;
  country: string;
  city: string;
  year: number;
  summary?: string;
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

export default function GalleryPublicPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const { lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicResp | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [contacting, setContacting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // 번역 관련 상태
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [showBioTranslation, setShowBioTranslation] = useState(false);
  const [translatingBio, setTranslatingBio] = useState(false);

  async function translateBio(bioText: string) {
    if (!bioText) return;
    if (translatedBio) {
      setShowBioTranslation(!showBioTranslation);
      return;
    }

    setTranslatingBio(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bioText, targetLang: lang }),
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

  useEffect(() => {
    (async () => {
      const m = await fetchMe();
      setMe(m);
    })();
  }, []);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    fetch(`/api/public/gallery/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, [id]);

  const profile = data && (data as any).ok ? (data as any).profile : null;
  const exhibitions =
    data && (data as any).ok
      ? ((data as any).exhibitions as Exhibition[] | undefined)
      : undefined;

  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [countryFilter, setCountryFilter] = useState<string>("ALL");

  const years = useMemo(() => {
    const list = (exhibitions ?? []).map((e) => e.year);
    return ["ALL", ...Array.from(new Set(list)).sort((a, b) => b - a).map(String)];
  }, [exhibitions]);

  const countries = useMemo(() => {
    const list = (exhibitions ?? [])
      .map((e) => (e.country ?? "").trim())
      .filter(Boolean);
    return ["ALL", ...Array.from(new Set(list)).sort((a, b) => a.localeCompare(b))];
  }, [exhibitions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (exhibitions ?? []).filter((e) => {
      if (yearFilter !== "ALL" && String(e.year) !== yearFilter) return false;
      if (countryFilter !== "ALL" && e.country !== countryFilter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        (e.summary ?? "").toLowerCase().includes(q)
      );
    });
  }, [exhibitions, query, yearFilter, countryFilter]);

  async function contactGalleryByName() {
    if (!profile?.userId) return;
    if (String(profile.userId).startsWith("__external_")) {
      setContactError("이 갤러리는 외부 오픈콜 소스입니다. 카드의 원문 링크를 통해 직접 지원해주세요.");
      return;
    }
    setContactError(null);
    setContacting(true);
    try {
      const ocRes = await fetch("/api/open-calls", { cache: "no-store" });
      const ocData = (await ocRes.json().catch(() => null)) as {
        openCalls?: { id: string; galleryId: string }[];
      } | null;
      const openCall = ocData?.openCalls?.find((o) => o.galleryId === profile.userId);
      if (!openCall) {
        throw new Error("이 갤러리의 오픈콜이 아직 없어요.");
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ openCallId: openCall.id, galleryId: profile.userId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.roomId) {
        throw new Error(data?.error ?? `Failed to create chat (${res.status})`);
      }
      router.push(`/chat/${String(data.roomId)}`);
    } catch (e: any) {
      setContactError(e?.message ?? "Failed to contact gallery");
    } finally {
      setContacting(false);
    }
  }

  return (
    <>
      <TopBar />

      <main style={{ maxWidth: 860, margin: "40px auto", padding: "0 12px" }}>
        {loading ? (
          <div style={{ padding: 14, opacity: 0.7 }}>Loading…</div>
        ) : !profile ? (
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 18,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18 }}>😵 Not found</div>
            <div style={{ marginTop: 8, opacity: 0.75 }}>
              공개된 갤러리 프로필을 찾을 수 없어요.
            </div>
            <button
              onClick={() => router.back()}
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 950,
                  textDecoration: me?.session?.role === "artist" ? "underline" : "none",
                  cursor: me?.session?.role === "artist" ? "pointer" : "default",
                  opacity: contacting ? 0.6 : 1,
                }}
                onClick={() => {
                  if (me?.session?.role === "artist" && !contacting) {
                    contactGalleryByName();
                  }
                }}
                title={
                  me?.session?.role === "artist"
                    ? "클릭해서 갤러리에 메시지 보내기"
                    : undefined
                }
              >
                {profile.name || "Unnamed Gallery"}
              </h1>
              <Chip tone="dark">GALLERY</Chip>
            </div>

            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
              📍 {profile.city || "-"}, {profile.country || "-"} • ID:{" "}
              <b>{profile.userId}</b>
            </div>

            <div
              style={{
                marginTop: 14,
                border: "1px solid #e6e6e6",
                borderRadius: 18,
                background: "#fff",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profile.website ? (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <Chip>🔗 Website</Chip>
                  </a>
                ) : (
                  <Chip tone="soft">🔗 Website 없음</Chip>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>
                    Bio
                  </div>
                  {profile.bio?.trim() && (
                    <button
                      onClick={() => translateBio(profile.bio!)}
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
                        원문: {profile.bio}
                      </div>
                    </>
                  ) : (
                    profile.bio?.trim() ? profile.bio : "Bio가 아직 없어요."
                  )}
                </div>
              </div>

              <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
                Updated:{" "}
                {profile.updatedAt
                  ? new Date(profile.updatedAt).toLocaleString()
                  : "-"}
              </div>
            </div>
          {contactError && (
            <div style={{ marginTop: 10, color: "#c00", fontSize: 12 }}>
              {contactError}
            </div>
          )}

            <div
              style={{
                marginTop: 14,
                border: "1px solid #e6e6e6",
                borderRadius: 18,
                background: "#fff",
                padding: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 900 }}>
                🗓️ Exhibition History
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title/city/summary..."
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    style={{
                      padding: 8,
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                    }}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y === "ALL" ? "All years" : y}
                      </option>
                    ))}
                  </select>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    style={{
                      padding: 8,
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                    }}
                  >
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c === "ALL" ? "All countries" : c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filtered.length > 0 ? (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {filtered.map((ex) => (
                    <div
                      key={ex.id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 12,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>{ex.title}</div>
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
                        {ex.city}, {ex.country} · {ex.year}
                      </div>
                      {ex.summary ? (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                          {ex.summary}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  No exhibitions found.
                </div>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                onClick={() => router.back()}
                style={{
                  padding: "10px 12px",
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
          </>
        )}
      </main>
    </>
  );
}
