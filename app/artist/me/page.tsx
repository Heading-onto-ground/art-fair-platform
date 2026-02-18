"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import ProfileImageUpload from "@/app/components/ProfileImageUpload";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";

type MeResponse = { session: { userId: string; role: "artist" | "gallery"; email: string } | null; profile: { id: string; artistId: string; name: string; startedYear: number; genre: string; instagram?: string; country: string; city: string; website?: string; bio?: string; portfolioUrl?: string; profileImage?: string | null; createdAt: number; updatedAt?: number } | null };
type Application = { id: string; openCallId: string; galleryId: string; status: string; shippingStatus: string };
type OpenCall = { id: string; gallery: string; city: string; country: string; theme: string; deadline: string };
type Invite = { id: string; galleryId: string; openCallId: string; message: string; status: string; createdAt: number };

const inp: React.CSSProperties = { width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid #E8E3DB", color: "#1A1A1A", fontFamily: F, fontSize: 13, fontWeight: 400, outline: "none" };
const btnStyle = (disabled: boolean): React.CSSProperties => ({ padding: "14px 32px", border: "none", background: disabled ? "#E8E3DB" : "#1A1A1A", color: disabled ? "#8A8580" : "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer" });

export default function ArtistMePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminView = searchParams.get("adminView") === "1";
  const [adminReadOnly, setAdminReadOnly] = useState(false);
  const { lang } = useLanguage();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [name, setName] = useState(""); const [artistId, setArtistId] = useState(""); const [startedYear, setStartedYear] = useState(""); const [genre, setGenre] = useState(""); const [instagram, setInstagram] = useState(""); const [country, setCountry] = useState(""); const [city, setCity] = useState(""); const [website, setWebsite] = useState(""); const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false); const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null); const [uploading, setUploading] = useState(false); const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]); const [openCallMap, setOpenCallMap] = useState<Record<string, OpenCall>>({}); const [invites, setInvites] = useState<Invite[]>([]);

  const loadMe = async () => {
    setLoadingMe(true);
    try {
      if (isAdminView) {
        const adminRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" }).catch(() => null);
        const adminData = adminRes ? await adminRes.json().catch(() => null) : null;
        if (adminData?.authenticated) {
          setAdminReadOnly(true);
          setMe({ session: { userId: "__admin_preview__", role: "artist", email: adminData?.session?.email || "admin@rob.art" }, profile: null });
          return;
        }
      }
      const res = await fetch("/api/auth/me", { cache: "default", credentials: "include" });
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

  useEffect(() => { loadMe(); }, [isAdminView]);
  useEffect(() => { if (!me?.session || adminReadOnly) return; loadApplications(); loadInvites(); }, [me?.session?.userId, adminReadOnly]);

  const loadApplications = async () => { const [appsRes, ocRes] = await Promise.all([fetch("/api/applications", { cache: "default", credentials: "include" }), fetch("/api/open-calls", { cache: "default" })]); const appsJson = await appsRes.json().catch(() => null); const ocJson = await ocRes.json().catch(() => null); const map: Record<string, OpenCall> = {}; for (const oc of ocJson?.openCalls ?? []) map[oc.id] = oc; setOpenCallMap(map); setApplications(appsJson?.applications ?? []); };
  const loadInvites = async () => { const res = await fetch("/api/artist/invites", { cache: "default", credentials: "include" }); const data = await res.json().catch(() => null); if (res.ok) setInvites(data?.invites ?? []); };
  const updateInviteStatus = async (id: string, status: string) => { if (adminReadOnly) return; const res = await fetch("/api/artist/invites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); const data = await res.json().catch(() => null); if (res.ok && data?.invite) setInvites((p) => p.map((i) => (i.id === id ? data.invite : i))); };

  const canSave = useMemo(() => name.trim() && artistId.trim() && startedYear.trim() && genre.trim() && country.trim() && city.trim(), [name, artistId, startedYear, genre, country, city]);

  const onSaveProfile = async () => { if (adminReadOnly) { setSaveMsg(lang === "ko" ? "관리자 미리보기 모드에서는 저장할 수 없습니다." : "Save is disabled in admin preview mode."); return; } setSaveMsg(null); if (!canSave) { setSaveMsg("Fill in all required fields"); return; } setSaving(true); try { const res = await fetch("/api/profile/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artistId: artistId.trim(), name: name.trim(), startedYear: Number(startedYear), genre: genre.trim(), instagram: instagram.trim(), country: country.trim(), city: city.trim(), website: website.trim() || undefined, bio: bio || undefined }) }); const data = await res.json().catch(() => null); if (!res.ok || !data?.ok) { setSaveMsg(data?.error ?? "Save failed"); return; } setSaveMsg("Profile saved"); await loadMe(); } finally { setSaving(false); } };
  const onUploadPdf = async () => { if (adminReadOnly) { setUploadMsg(lang === "ko" ? "관리자 미리보기 모드에서는 업로드할 수 없습니다." : "Upload is disabled in admin preview mode."); return; } setUploadMsg(null); if (!file || file.type !== "application/pdf") { setUploadMsg("Select a PDF file"); return; } setUploading(true); try { const form = new FormData(); form.append("file", file); const res = await fetch("/api/profile/upload", { method: "POST", body: form }); const data = await res.json().catch(() => null); if (!res.ok || !data?.ok) { setUploadMsg(data?.error ?? "Upload failed"); return; } setUploadMsg("Portfolio uploaded"); setFile(null); await loadMe(); } finally { setUploading(false); } };

  const session = me?.session; const profile = me?.profile;

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "56px 40px" }}>
        {adminReadOnly && (
          <div style={{ marginBottom: 20, padding: "12px 14px", border: "1px solid #E8E3DB", background: "#FAF8F4", color: "#8A8580", fontFamily: F, fontSize: 11, letterSpacing: "0.04em" }}>
            {lang === "ko" ? "관리자 미리보기 모드 (읽기 전용)" : "Admin preview mode (read-only)"}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", color: "#8B7355", textTransform: "uppercase" }}>{t("nav_profile", lang)}</span>
            <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>{t("artist", lang)}</h1>
            <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", marginTop: 4 }}>{session?.email}</p>
          </div>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", padding: "8px 16px", border: "1px solid #E8E3DB" }}>Artist</span>
        </div>

        {loadingMe ? <p style={{ fontFamily: F, color: "#B0AAA2", textAlign: "center", padding: 48 }}>Loading...</p> : (
          <>
            {/* Profile Summary */}
            <Section number="01" title={t("profile_section", lang)}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <ProfileImageUpload
                  currentImage={profile?.profileImage}
                  onUploaded={async () => {
                    await loadMe();
                  }}
                />
              </div>
              <h3 style={{ fontFamily: S, fontSize: 32, fontWeight: 400, color: "#1A1A1A", marginBottom: 8 }}>{profile?.name || t("profile_no_name", lang)}</h3>
              <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580", fontWeight: 300 }}>{profile ? `${profile.city}, ${profile.country}` : t("profile_complete", lang)}</p>
              <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {profile?.artistId && <Tag>{profile.artistId}</Tag>}
                {profile?.startedYear && <Tag>{new Date().getFullYear() - profile.startedYear + 1} years</Tag>}
                {profile?.genre && <Tag>{profile.genre}</Tag>}
                {profile?.instagram && <a href={profile.instagram} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Tag accent>Instagram</Tag></a>}
                {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Tag accent>Website</Tag></a>}
              </div>
            </Section>

            {/* Edit */}
            <Section number="02" title={t("profile_edit", lang)}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <Lbl label="Artist ID *"><input value={artistId} onChange={(e) => setArtistId(e.target.value)} placeholder="art-0001" style={inp} /></Lbl>
                <Lbl label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inp} /></Lbl>
                <Lbl label="Start year *"><input value={startedYear} onChange={(e) => setStartedYear(e.target.value)} placeholder="2018" style={inp} /></Lbl>
                <Lbl label="Genre *"><input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Painting" style={inp} /></Lbl>
                <Lbl label="Country *"><input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Korea" style={inp} /></Lbl>
                <Lbl label="City *"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Seoul" style={inp} /></Lbl>
                <Lbl label="Instagram"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" style={inp} /></Lbl>
                <Lbl label="Website"><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." style={inp} /></Lbl>
              </div>
              <Lbl label="Bio" style={{ marginTop: 18 }}><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short bio..." rows={4} style={{ ...inp, width: "100%", resize: "vertical" }} /></Lbl>
              <div style={{ marginTop: 20, display: "flex", gap: 16, alignItems: "center" }}>
                <button onClick={onSaveProfile} disabled={saving || !canSave} style={btnStyle(saving || !canSave)}>{saving ? t("profile_saving", lang) : t("profile_save", lang)}</button>
                {saveMsg && <span style={{ fontFamily: F, fontSize: 12, color: saveMsg.includes("saved") ? "#5A7A5A" : "#8B4A4A" }}>{saveMsg}</span>}
              </div>
            </Section>

            {/* Portfolio */}
            <Section number="03" title={t("profile_portfolio", lang)}>
              {profile?.portfolioUrl && (
                <div style={{ marginBottom: 20 }}>
                  <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{ padding: "12px 24px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>{t("profile_view_pdf", lang)}</a>
                </div>
              )}
              <div style={{ padding: 24, border: "1px dashed #E8E3DB", background: "#FAF8F4" }}>
                <p style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", marginBottom: 16 }}>{profile?.portfolioUrl ? t("profile_replace", lang) : t("profile_upload", lang)}</p>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ padding: "12px 24px", border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#8A8580", fontFamily: F, fontSize: 11, fontWeight: 400, cursor: "pointer" }}>
                    {file ? file.name : t("profile_select_pdf", lang)}
                    <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
                  </label>
                  <button onClick={onUploadPdf} disabled={uploading || !file} style={btnStyle(uploading || !file)}>{uploading ? t("profile_uploading", lang) : t("profile_upload_btn", lang)}</button>
                </div>
                {uploadMsg && <p style={{ marginTop: 16, fontFamily: F, fontSize: 12, color: uploadMsg.includes("uploaded") ? "#5A7A5A" : "#8B4A4A" }}>{uploadMsg}</p>}
              </div>
            </Section>

            {/* Applications */}
            <Section number="04" title={t("profile_applications", lang)}>
              {applications.length === 0 ? <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>{t("profile_no_apps", lang)}</p> : (
                <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
                  {applications.map((a) => { const oc = openCallMap[a.openCallId]; return (
                    <div key={a.id} style={{ padding: 24, background: "#FFFFFF" }}>
                      <h4 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A", marginBottom: 6 }}>{oc ? `${oc.country} ${oc.city} — ${oc.gallery}` : a.openCallId}</h4>
                      <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580" }}>Status: <span style={{ color: a.status === "accepted" ? "#5A7A5A" : "#1A1A1A" }}>{a.status}</span> · Shipping: {a.shippingStatus}</p>
                      <button onClick={() => router.push(`/open-calls/${a.openCallId}`)} style={{ marginTop: 12, padding: "8px 18px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>{t("profile_view_details", lang)}</button>
                    </div>
                  ); })}
                </div>
              )}
            </Section>

            {/* Invites */}
            <Section number="05" title={t("profile_invites", lang)}>
              {invites.length === 0 ? <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>{t("profile_no_invites", lang)}</p> : (
                <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
                  {invites.map((i) => (
                    <div key={i.id} style={{ padding: 24, background: "#FFFFFF" }}>
                      <p style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B0AAA2", marginBottom: 8 }}>Gallery: {i.galleryId} · {new Date(i.createdAt).toLocaleDateString()}</p>
                      <p style={{ fontFamily: F, fontSize: 13, color: "#1A1A1A", marginBottom: 8, fontWeight: 300 }}>{i.message}</p>
                      <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginBottom: 16 }}>Status: <span style={{ color: i.status === "accepted" ? "#5A7A5A" : "#1A1A1A" }}>{i.status}</span></p>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => updateInviteStatus(i.id, "accepted")} style={{ padding: "10px 24px", border: "none", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>{t("profile_accept", lang)}</button>
                        <button onClick={() => updateInviteStatus(i.id, "declined")} style={{ padding: "10px 24px", border: "1px solid #8B4A4A", background: "transparent", color: "#8B4A4A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>{t("profile_decline", lang)}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </main>
    </>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
        <span style={{ fontFamily: S, fontSize: 28, fontWeight: 300, color: "#D4CEC4" }}>{number}</span>
        <h2 style={{ fontFamily: S, fontSize: 22, fontWeight: 400, color: "#1A1A1A" }}>{title}</h2>
      </div>
      <div style={{ border: "1px solid #E8E3DB", padding: 32, background: "#FFFFFF" }}>{children}</div>
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return <span style={{ padding: "6px 14px", background: accent ? "rgba(139,115,85,0.08)" : "transparent", border: accent ? "none" : "1px solid #E8E3DB", color: accent ? "#8B7355" : "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.06em" }}>{children}</span>;
}

function Lbl({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}><label style={{ display: "block", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8580", marginBottom: 8 }}>{label}</label>{children}</div>;
}
