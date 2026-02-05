"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";

type MeResponse = {
  session: { userId: string; role: "artist" | "gallery"; email: string } | null;
  profile: {
    id: string; artistId: string; name: string; startedYear: number; genre: string;
    instagram?: string; country: string; city: string; website?: string; bio?: string;
    portfolioUrl?: string; createdAt: number; updatedAt?: number;
  } | null;
};

type Application = {
  id: string; openCallId: string; galleryId: string; status: string; shippingStatus: string;
};

type OpenCall = { id: string; gallery: string; city: string; country: string; theme: string; deadline: string };

type Invite = { id: string; galleryId: string; openCallId: string; message: string; status: string; createdAt: number };

export default function ArtistMePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

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
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [openCallMap, setOpenCallMap] = useState<Record<string, OpenCall>>({});
  const [invites, setInvites] = useState<Invite[]>([]);

  const loadMe = async () => {
    setLoadingMe(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as MeResponse;
      setMe(data);
      if (!data.session) { router.push("/login"); return; }
      if (data.session.role !== "artist") { router.push("/gallery"); return; }
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

  useEffect(() => { loadMe(); }, []);

  useEffect(() => {
    if (!me?.session) return;
    loadApplications();
    loadInvites();
  }, [me?.session?.userId]);

  const loadApplications = async () => {
    const [appsRes, ocRes] = await Promise.all([
      fetch("/api/applications", { cache: "no-store", credentials: "include" }),
      fetch("/api/open-calls", { cache: "no-store" }),
    ]);
    const appsJson = await appsRes.json().catch(() => null);
    const ocJson = await ocRes.json().catch(() => null);
    const map: Record<string, OpenCall> = {};
    for (const oc of ocJson?.openCalls ?? []) map[oc.id] = oc;
    setOpenCallMap(map);
    setApplications(appsJson?.applications ?? []);
  };

  const loadInvites = async () => {
    const res = await fetch("/api/artist/invites", { cache: "no-store", credentials: "include" });
    const data = await res.json().catch(() => null);
    if (res.ok) setInvites(data?.invites ?? []);
  };

  const updateInviteStatus = async (id: string, status: string) => {
    const res = await fetch("/api/artist/invites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.invite) setInvites((p) => p.map((i) => (i.id === id ? data.invite : i)));
  };

  const canSave = useMemo(() => name.trim() && artistId.trim() && startedYear.trim() && genre.trim() && country.trim() && city.trim(), [name, artistId, startedYear, genre, country, city]);

  const onSaveProfile = async () => {
    setSaveMsg(null);
    if (!canSave) { setSaveMsg("필수 정보를 입력해주세요."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: artistId.trim(), name: name.trim(), startedYear: Number(startedYear), genre: genre.trim(), instagram: instagram.trim(), country: country.trim(), city: city.trim(), website: website.trim() || undefined, bio: bio || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { setSaveMsg(data?.error ?? "저장 실패"); return; }
      setSaveMsg("저장 완료 ✅");
      await loadMe();
    } finally {
      setSaving(false);
    }
  };

  const onUploadPdf = async () => {
    setUploadMsg(null);
    if (!file || file.type !== "application/pdf") { setUploadMsg("PDF 파일을 선택해주세요."); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { setUploadMsg(data?.error ?? "업로드 실패"); return; }
      setUploadMsg("업로드 완료 ✅");
      setFile(null);
      await loadMe();
    } finally {
      setUploading(false);
    }
  };

  const session = me?.session;
  const profile = me?.profile;

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 800, margin: "28px auto", padding: "0 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>Artist Profile</h1>
            <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>{session?.email}</p>
          </div>
          <span style={{ padding: "6px 14px", borderRadius: 999, background: "#6366f1", color: "white", fontWeight: 700, fontSize: 12 }}>ARTIST</span>
        </div>

        {loadingMe ? (
          <p style={{ color: "#888" }}>Loading...</p>
        ) : (
          <>
            {/* Profile Summary */}
            <Card title="Profile Summary">
              <div style={{ fontWeight: 700, fontSize: 18, color: "#111" }}>{profile?.name || "No name yet"}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{profile ? `${profile.city}, ${profile.country}` : "프로필을 작성해주세요"}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profile?.artistId && <Chip>🆔 {profile.artistId}</Chip>}
                {profile?.startedYear && <Chip>⏳ {new Date().getFullYear() - profile.startedYear + 1}년차</Chip>}
                {profile?.genre && <Chip>🎨 {profile.genre}</Chip>}
                {profile?.instagram && <a href={profile.instagram} target="_blank" rel="noreferrer"><Chip accent>📷 Instagram</Chip></a>}
                {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer"><Chip accent>🔗 Website</Chip></a>}
              </div>
            </Card>

            {/* Edit Form */}
            <Card title="Edit Profile" style={{ marginTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Artist ID *"><input value={artistId} onChange={(e) => setArtistId(e.target.value)} placeholder="ART-0001" /></Field>
                <Field label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Min Kim" /></Field>
                <Field label="Start Year *"><input value={startedYear} onChange={(e) => setStartedYear(e.target.value)} placeholder="2018" /></Field>
                <Field label="Genre *"><input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Painting" /></Field>
                <Field label="Country *"><input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="한국" /></Field>
                <Field label="City *"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Seoul" /></Field>
                <Field label="Instagram"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." /></Field>
                <Field label="Website"><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." /></Field>
              </div>
              <Field label="Bio" style={{ marginTop: 14 }}>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short bio..." rows={3} style={{ width: "100%", resize: "vertical" }} />
              </Field>
              <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={onSaveProfile} disabled={saving || !canSave} style={{ padding: "12px 20px", borderRadius: 8, border: "none", background: saving || !canSave ? "#ccc" : "#6366f1", color: "white", fontWeight: 700, cursor: saving || !canSave ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving..." : "Save Profile"}
                </button>
                {saveMsg && <span style={{ fontSize: 13, color: "#666" }}>{saveMsg}</span>}
              </div>
            </Card>

            {/* Portfolio */}
            <Card title="Portfolio PDF" style={{ marginTop: 16 }}>
              {profile?.portfolioUrl ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                  <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{ padding: "10px 14px", borderRadius: 8, background: "#6366f1", color: "white", fontWeight: 600, textDecoration: "none" }}>📄 Open PDF</a>
                  <span style={{ fontSize: 12, color: "#aaa" }}>{profile.portfolioUrl}</span>
                </div>
              ) : (
                <p style={{ color: "#888", marginBottom: 14 }}>아직 업로드된 포트폴리오가 없어요.</p>
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button onClick={onUploadPdf} disabled={uploading} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: uploading ? "#ccc" : "#6366f1", color: "white", fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer" }}>
                  {uploading ? "Uploading..." : "Upload PDF"}
                </button>
                {uploadMsg && <span style={{ fontSize: 13 }}>{uploadMsg}</span>}
              </div>
            </Card>

            {/* Applications */}
            <Card title="Applications" style={{ marginTop: 16 }}>
              {applications.length === 0 ? (
                <p style={{ color: "#888" }}>아직 지원한 내역이 없어요.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {applications.map((a) => {
                    const oc = openCallMap[a.openCallId];
                    return (
                      <div key={a.id} style={{ padding: 14, borderRadius: 10, background: "#f9f9f9", border: "1px solid #eee" }}>
                        <div style={{ fontWeight: 700, color: "#111" }}>{oc ? `${oc.country} ${oc.city} · ${oc.gallery}` : a.openCallId}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#888" }}>Status: {a.status} · Shipping: {a.shippingStatus}</div>
                        <button onClick={() => router.push(`/open-calls/${a.openCallId}`)} style={{ marginTop: 10, padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e5e5", background: "white", color: "#555", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>View Open Call</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Invites */}
            <Card title="Invites" style={{ marginTop: 16 }}>
              {invites.length === 0 ? (
                <p style={{ color: "#888" }}>받은 초대가 없습니다.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {invites.map((i) => (
                    <div key={i.id} style={{ padding: 14, borderRadius: 10, background: "#f9f9f9", border: "1px solid #eee" }}>
                      <div style={{ fontWeight: 700, color: "#111" }}>OpenCall: {i.openCallId} · Gallery: {i.galleryId}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#888" }}>{new Date(i.createdAt).toLocaleString()} · Status: {i.status}</div>
                      <div style={{ marginTop: 6, color: "#555" }}>{i.message}</div>
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <button onClick={() => updateInviteStatus(i.id, "accepted")} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#10b981", color: "white", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Accept</button>
                        <button onClick={() => updateInviteStatus(i.id, "declined")} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#ef4444", color: "white", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 14, padding: 20, ...style }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{ padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: accent ? "rgba(99,102,241,0.1)" : "#f5f5f5", border: accent ? "1px solid #6366f1" : "1px solid #e5e5e5", color: accent ? "#6366f1" : "#666" }}>
      {children}
    </span>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
