"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type Role = "artist" | "gallery";

type MeResponse = {
  session: {
    userId: string;
    role: Role;
    email: string;
  } | null;

  profile: {
    id: string;
    role: "artist";
    email: string;
    artistId: string;
    name: string;
    startedYear: number;
    genre: string;
    instagram?: string;
    country: string;
    city: string;
    website?: string;
    bio?: string;
    portfolioUrl?: string;
    createdAt: number;
    updatedAt?: number;
  } | null;
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

type OpenCall = {
  id: string;
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  deadline: string;
};

type Invite = {
  id: string;
  galleryId: string;
  artistId: string;
  openCallId: string;
  message: string;
  status: "sent" | "viewed" | "accepted" | "declined";
  createdAt: number;
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

export default function ArtistMePage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  // profile edit form state
  const [name, setName] = useState("");
  const [artistId, setArtistId] = useState("");
  const [startedYear, setStartedYear] = useState("");
  const [genre, setGenre] = useState("");
  const [instagram, setInstagram] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // portfolio upload
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [openCallMap, setOpenCallMap] = useState<Record<string, OpenCall>>({});
  const [invites, setInvites] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const loadMe = async () => {
    setLoadingMe(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as MeResponse;

      setMe(data);

      // auth / role guard
      if (!data.session) {
        router.push("/login");
        return;
      }
      if (data.session.role !== "artist") {
        router.push("/gallery");
        return;
      }

      // hydrate form with existing profile (if any)
      const p = data.profile;
      setArtistId(p?.artistId ?? "");
      setName(p?.name ?? "");
      setStartedYear(p?.startedYear ? String(p.startedYear) : "");
      setGenre(p?.genre ?? "");
      setInstagram(p?.instagram ?? "");
      setCountry(p?.country ?? "");
      setCity(p?.city ?? "");
      setWebsite(p?.website ?? "");
      setBio(p?.bio ?? "");
    } finally {
      setLoadingMe(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me?.session) return;
    loadApplications();
    loadInvites();
  }, [me?.session?.userId]);

  const loadApplications = async () => {
    if (!me?.session) return;
    setApplicationsLoading(true);
    try {
      const [appsRes, ocRes] = await Promise.all([
        fetch("/api/applications", { cache: "no-store", credentials: "include" }),
        fetch("/api/open-calls", { cache: "no-store" }),
      ]);
      const appsJson = await appsRes.json().catch(() => null);
      const ocJson = await ocRes.json().catch(() => null);

      const list = Array.isArray(appsJson?.applications) ? appsJson.applications : [];
      const ocs = Array.isArray(ocJson?.openCalls) ? ocJson.openCalls : [];
      const map: Record<string, OpenCall> = {};
      for (const oc of ocs) {
        map[oc.id] = oc;
      }
      setOpenCallMap(map);
      setApplications(list);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const loadInvites = async () => {
    setInvitesLoading(true);
    try {
      const res = await fetch("/api/artist/invites", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setInvites(Array.isArray(data?.invites) ? data.invites : []);
      }
    } finally {
      setInvitesLoading(false);
    }
  };

  const updateInviteStatus = async (id: string, status: Invite["status"]) => {
    const res = await fetch("/api/artist/invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.invite) {
      setInvites((p) => p.map((i) => (i.id === id ? data.invite : i)));
    }
  };

  const canSave = useMemo(() => {
    return name.trim() && artistId.trim() && startedYear.trim() && genre.trim() && country.trim() && city.trim();
  }, [name, artistId, startedYear, genre, country, city]);

  const onSaveProfile = async () => {
    setSaveMsg(null);

    if (!me?.session) {
      router.push("/login");
      return;
    }
    if (!canSave) {
      setSaveMsg("이름 / 국가 / 도시 는 필수예요.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        artistId: artistId.trim(),
        name: name.trim(),
        startedYear: Number(startedYear),
        genre: genre.trim(),
        instagram: instagram.trim(),
        country: country.trim(),
        city: city.trim(),
        website: website.trim() || undefined,
        bio: bio || undefined,
      };

      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setSaveMsg(data?.error ?? `저장 실패 (${res.status})`);
        return;
      }

      setSaveMsg("저장 완료 ✅");
      await loadMe();
    } catch (e) {
      setSaveMsg("서버 오류");
    } finally {
      setSaving(false);
    }
  };

  const onUploadPdf = async () => {
    setUploadMsg(null);

    if (!file) {
      setUploadMsg("PDF 파일을 선택해주세요.");
      return;
    }
    if (file.type !== "application/pdf") {
      setUploadMsg("PDF만 업로드할 수 있어요.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/profile/upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setUploadMsg(data?.error ?? `업로드 실패 (${res.status})`);
        return;
      }

      setUploadMsg("업로드 완료 ✅");
      setFile(null);
      await loadMe();
    } catch (e) {
      setUploadMsg("서버 오류");
    } finally {
      setUploading(false);
    }
  };

  const session = me?.session;
  const profile = me?.profile;

  return (
    <>
      <TopBar />

      <main style={{ maxWidth: 860, margin: "22px auto", padding: "0 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            🪪 Artist Profile
          </h1>
          {session?.email ? <Chip tone="soft">{session.email}</Chip> : null}
        </div>

        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
          Your public identity + portfolio used for open call applications.
        </div>

        {loadingMe ? (
          <div style={{ padding: 14, opacity: 0.7 }}>Loading…</div>
        ) : (
          <>
            {/* Profile summary card */}
            <div
              style={{
                marginTop: 14,
                border: "1px solid #e6e6e6",
                borderRadius: 18,
                background: "#fff",
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {profile?.name?.trim() ? profile.name : "No name yet"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    {profile ? (
                      <>
                        {profile.city}, {profile.country} • id: {profile.id}
                      </>
                    ) : (
                      <>프로필이 아직 없어요. 아래에서 작성하고 저장해줘!</>
                    )}
                  </div>
                </div>
                <Chip tone="dark">ARTIST</Chip>
              </div>

              {/* Links */}
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
              {profile?.artistId ? <Chip>🆔 {profile.artistId}</Chip> : null}
              {profile?.startedYear ? (
                <Chip>⏳ {new Date().getFullYear() - profile.startedYear + 1}년차</Chip>
              ) : null}
              {profile?.genre ? <Chip>🎨 {profile.genre}</Chip> : null}
              {profile?.instagram ? (
                <a
                  href={profile.instagram}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontWeight: 800, textDecoration: "none" }}
                >
                  📷 Instagram
                </a>
              ) : null}
                <Chip>📍 {profile?.city ?? "-"}</Chip>
                <Chip>🌍 {profile?.country ?? "-"}</Chip>
                {profile?.website ? (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontWeight: 800, textDecoration: "none" }}
                  >
                    🔗 Website
                  </a>
                ) : null}
                {profile?.createdAt ? (
                  <span style={{ fontSize: 12, opacity: 0.65 }}>
                    Created: {new Date(profile.createdAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Edit form */}
            <div
              style={{
                marginTop: 14,
                border: "1px solid #e6e6e6",
                borderRadius: 18,
                background: "#fff",
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                ✏️ Edit Profile
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                    Artist ID *
                  </div>
                  <input
                    value={artistId}
                    onChange={(e) => setArtistId(e.target.value)}
                    placeholder="e.g., ART-0001"
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                    Name *
                  </div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Min Kim"
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                    Start Year *
                  </div>
                  <input
                    value={startedYear}
                    onChange={(e) => setStartedYear(e.target.value)}
                    placeholder="e.g., 2018"
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                    Genre *
                  </div>
                  <input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g., Painting"
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                    Instagram
                  </div>
                  <input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/..."
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                    Country *
                  </div>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g., South Korea"
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                    City *
                  </div>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., Seoul"
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                    Website
                  </div>
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                  Bio
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short bio..."
                  rows={6}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid #ddd",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={onSaveProfile}
                  disabled={saving || !canSave}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #111",
                    background: saving || !canSave ? "#555" : "#111",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: saving || !canSave ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/artist")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    background: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  ← Back to Open Calls
                </button>

                {saveMsg ? (
                  <span style={{ alignSelf: "center", fontSize: 13 }}>
                    {saveMsg}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Portfolio upload */}
            <div
              style={{
                marginTop: 14,
                border: "1px solid #e6e6e6",
                borderRadius: 18,
                background: "#fff",
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                📄 Portfolio PDF
              </div>

              {profile?.portfolioUrl ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <a
                    href={profile.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid #111",
                      background: "#111",
                      color: "#fff",
                      fontWeight: 900,
                      textDecoration: "none",
                    }}
                  >
                    📄 Open PDF
                  </a>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    {profile.portfolioUrl}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  아직 업로드된 포트폴리오가 없어요.
                </div>
              )}

              <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={onUploadPdf}
                  disabled={uploading}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #111",
                    background: uploading ? "#555" : "#111",
                    color: "#fff",
                    fontWeight: 900,
                    cursor: uploading ? "not-allowed" : "pointer",
                  }}
                >
                  {uploading ? "Uploading..." : "Upload PDF"}
                </button>

                {uploadMsg ? (
                  <span style={{ fontSize: 13 }}>{uploadMsg}</span>
                ) : null}
              </div>
            </div>

            {/* Applications */}
            <div
              style={{
                marginTop: 14,
                border: "1px solid #e6e6e6",
                borderRadius: 18,
                background: "#fff",
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                📌 지원 내역
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={loadApplications}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Load Applications
                </button>
                {applicationsLoading ? (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Loading…</span>
                ) : null}
              </div>

              {applications.length === 0 && !applicationsLoading ? (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                  아직 지원한 내역이 없어요.
                </div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {applications.map((a) => {
                    const oc = openCallMap[a.openCallId];
                    return (
                      <div
                        key={a.id}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 12,
                          padding: 12,
                          background: "#fafafa",
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>
                          {oc ? (
                            <>
                              {oc.country} {oc.city} ·{" "}
                              <span
                                onClick={() =>
                                  router.push(`/galleries/${encodeURIComponent(a.galleryId)}`)
                                }
                                style={{ textDecoration: "underline", cursor: "pointer" }}
                              >
                                {oc.gallery}
                              </span>
                            </>
                          ) : (
                            <>
                              OpenCall: {a.openCallId} ·{" "}
                              <span
                                onClick={() =>
                                  router.push(`/galleries/${encodeURIComponent(a.galleryId)}`)
                                }
                                style={{ textDecoration: "underline", cursor: "pointer" }}
                              >
                                {a.galleryId}
                              </span>
                            </>
                          )}
                        </div>
                        {oc ? (
                          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
                            Theme: {oc.theme} · Deadline: {oc.deadline}
                          </div>
                        ) : null}
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                          Status: {a.status} · Shipping: {a.shippingStatus}
                          {a.shippingCarrier ? ` · Carrier: ${a.shippingCarrier}` : ""}
                          {a.trackingNumber ? ` · Tracking: ${a.trackingNumber}` : ""}
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
                        <div style={{ marginTop: 8 }}>
                          <button
                            onClick={() => router.push(`/open-calls/${a.openCallId}`)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid #ddd",
                              background: "#fff",
                              fontWeight: 800,
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            View Open Call
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invites */}
            <div
              style={{
                marginTop: 14,
                border: "1px solid #e6e6e6",
                borderRadius: 18,
                background: "#fff",
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                📨 초대 내역
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={loadInvites}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Refresh Invites
                </button>
                {invitesLoading ? (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Loading…</span>
                ) : null}
              </div>

              {invites.length === 0 && !invitesLoading ? (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                  받은 초대가 없습니다.
                </div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {invites.map((i) => (
                    <div
                      key={i.id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 12,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>
                        OpenCall: {i.openCallId} · Gallery: {i.galleryId}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                        {new Date(i.createdAt).toLocaleString()}
                      </div>
                      <div style={{ marginTop: 6 }}>{i.message}</div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          Status: {i.status}
                        </span>
                        <button
                          onClick={() => updateInviteStatus(i.id, "viewed")}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "#fff",
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Mark Viewed
                        </button>
                        <button
                          onClick={() => updateInviteStatus(i.id, "accepted")}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid #111",
                            background: "#111",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateInviteStatus(i.id, "declined")}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(200,0,0,0.4)",
                            background: "rgba(200,0,0,0.06)",
                            color: "#b00",
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
