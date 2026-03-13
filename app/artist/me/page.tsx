"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import ProfileImageUpload from "@/app/components/ProfileImageUpload";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";
import { COUNTRIES, normalizeCountry } from "@/lib/countries";

type MeResponse = { session: { userId: string; role: "artist" | "gallery"; email: string } | null; profile: { id: string; artistId: string; name: string; startedYear: number; genre: string; instagram?: string; country: string; city: string; website?: string; bio?: string; portfolioUrl?: string; profileImage?: string | null; workNote?: string | null; createdAt: number; updatedAt?: number } | null };
type Application = { id: string; openCallId: string; galleryId: string; status: string; shippingStatus: string };
type OpenCall = { id: string; gallery: string; city: string; country: string; theme: string; deadline: string };
type Invite = { id: string; galleryId: string; openCallId: string; message: string; status: string; createdAt: number };

const inp: React.CSSProperties = { width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid #E8E3DB", color: "#1A1A1A", fontFamily: F, fontSize: 13, fontWeight: 400, outline: "none" };
const inpHighlight: React.CSSProperties = { ...inp, border: "1px solid #8B7355", background: "#FFFBF5" };
const btnStyle = (disabled: boolean): React.CSSProperties => ({ padding: "14px 32px", border: "none", background: disabled ? "#E8E3DB" : "#1A1A1A", color: disabled ? "#8A8580" : "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer" });

export default function ArtistMePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminView = searchParams.get("adminView") === "1";
  const adminUserId = searchParams.get("userId");
  const focusImprove = searchParams.get("focus") === "improve";
  const [adminReadOnly, setAdminReadOnly] = useState(false);
  const { lang } = useLanguage();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [name, setName] = useState(""); const [artistId, setArtistId] = useState(""); const [startedYear, setStartedYear] = useState(""); const [genre, setGenre] = useState(""); const [instagram, setInstagram] = useState(""); const [country, setCountry] = useState(""); const [city, setCity] = useState(""); const [website, setWebsite] = useState(""); const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false); const [saveMsg, setSaveMsg] = useState<string | null>(null);
  useEffect(() => {
    if (focusImprove && !loadingMe) {
      setTimeout(() => document.getElementById("improve-banner")?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [focusImprove, loadingMe]);
  const [notifyPost, setNotifyPost] = useState(false);
  const [file, setFile] = useState<File | null>(null); const [uploading, setUploading] = useState(false); const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]); const [openCallMap, setOpenCallMap] = useState<Record<string, OpenCall>>({}); const [invites, setInvites] = useState<Invite[]>([]);
  const [exhibitions, setExhibitions] = useState<any[]>([]); const [exPublic, setExPublic] = useState(false); const [exArtistId, setExArtistId] = useState<string | null>(null); const [exCopied, setExCopied] = useState(false); const [exToggling, setExToggling] = useState(false);
  const [workNote, setWorkNote] = useState(""); const [workNoteSaving, setWorkNoteSaving] = useState(false); const [workNoteMsg, setWorkNoteMsg] = useState<string | null>(null);

  type SelfExhibition = { id: string; title: string; startDate?: string | null; endDate?: string | null; city?: string | null; country?: string | null; description?: string | null; isPublic: boolean; space?: { name: string; type?: string | null; website?: string | null } | null; curator?: { name: string; organization?: string | null } | null; artists: { id: string; artistId: string; status: string; artist: { name: string; artistId: string; country?: string | null } }[] };
  type SelfExForm = { title: string; startDate: string; endDate: string; city: string; country: string; description: string; isPublic: boolean; spaceName: string; spaceType: string; spaceWebsite: string; curatorName: string; curatorOrganization: string };
  const emptySelfExForm = (): SelfExForm => ({ title: "", startDate: "", endDate: "", city: "", country: "", description: "", isPublic: false, spaceName: "", spaceType: "", spaceWebsite: "", curatorName: "", curatorOrganization: "" });
  const [selfExhibitions, setSelfExhibitions] = useState<SelfExhibition[]>([]);
  const [selfExForm, setSelfExForm] = useState<SelfExForm | null>(null);
  const [editingSelfExId, setEditingSelfExId] = useState<string | null>(null);
  const [selfExMsg, setSelfExMsg] = useState<string | null>(null);
  const [selfExSaving, setSelfExSaving] = useState(false);
  const [inviteArtistId, setInviteArtistId] = useState("");
  const [invitingExId, setInvitingExId] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  type SeriesItem = { id: string; title: string; description?: string | null; startYear?: number | null; endYear?: number | null; works?: string | null; isPublic: boolean };
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]); const [seriesForm, setSeriesForm] = useState<{ title: string; description: string; startYear: string; endYear: string; works: string; isPublic: boolean } | null>(null); const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null); const [seriesMsg, setSeriesMsg] = useState<string | null>(null); const [seriesSaving, setSeriesSaving] = useState(false);

  type ArtEventItem = { id: string; eventType: string; title: string; year: number; description?: string | null; isPublic: boolean };
  type ArtEventForm = { eventType: string; title: string; year: string; description: string; isPublic: boolean };
  const emptyArtEventForm = (): ArtEventForm => ({ eventType: "exhibition", title: "", year: String(new Date().getFullYear()), description: "", isPublic: true });
  const [artEvents, setArtEvents] = useState<ArtEventItem[]>([]);
  const [artEventForm, setArtEventForm] = useState<ArtEventForm | null>(null);
  const [editingArtEventId, setEditingArtEventId] = useState<string | null>(null);
  const [artEventMsg, setArtEventMsg] = useState<string | null>(null);
  const [artEventSaving, setArtEventSaving] = useState(false);

  const loadMe = async () => {
    setLoadingMe(true);
    try {
      if (isAdminView) {
        const adminRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" }).catch(() => null);
        const adminData = adminRes ? await adminRes.json().catch(() => null) : null;
        if (adminData?.authenticated) {
          setAdminReadOnly(true);
          if (adminUserId) {
            const profRes = await fetch(`/api/admin/artist-profile?userId=${adminUserId}`, { cache: "no-store", credentials: "include" }).catch(() => null);
            const profData = profRes?.ok ? await profRes.json().catch(() => null) : null;
            const p = profData?.profile ?? null;
            if (p) {
              setArtistId(p.artistId ?? ""); setName(p.name ?? ""); setStartedYear(p.startedYear ? String(p.startedYear) : "");
              setGenre(p.genre ?? ""); setInstagram(p.instagram ?? ""); setCountry(normalizeCountry(p.country ?? ""));
              setCity(p.city ?? ""); setWebsite(p.website ?? ""); setBio(p.bio ?? "");
            }
            setMe({ session: { userId: adminUserId, role: "artist", email: "" }, profile: p });
          } else {
            setMe({ session: { userId: "__admin_preview__", role: "artist", email: adminData?.session?.email || "admin@rob-roleofbridge.com" }, profile: null });
          }
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
      setCountry(normalizeCountry(p?.country ?? ""));
      setCity(p?.city ?? "");
      setWebsite(p?.website ?? "");
      setBio(p?.bio ?? "");
      setNotifyPost((p as any)?.notify_new_community_post ?? false);
      setWorkNote((p as any)?.workNote ?? "");
    } finally {
      setLoadingMe(false);
    }
  };

  useEffect(() => { loadMe(); }, [isAdminView, adminUserId]);
  useEffect(() => { if (!me?.session || adminReadOnly) return; loadApplications(); loadInvites(); loadExhibitions(); loadSeries(); loadSelfExhibitions(); loadArtEvents(); }, [me?.session?.userId, adminReadOnly]);

  const loadApplications = async () => { const [appsRes, ocRes] = await Promise.all([fetch("/api/applications", { cache: "default", credentials: "include" }), fetch("/api/open-calls", { cache: "default" })]); const appsJson = await appsRes.json().catch(() => null); const ocJson = await ocRes.json().catch(() => null); const map: Record<string, OpenCall> = {}; for (const oc of ocJson?.openCalls ?? []) map[oc.id] = oc; setOpenCallMap(map); setApplications(appsJson?.applications ?? []); };
  const loadInvites = async () => { const res = await fetch("/api/artist/invites", { cache: "default", credentials: "include" }); const data = await res.json().catch(() => null); if (res.ok) setInvites(data?.invites ?? []); };
  const loadExhibitions = async () => { const res = await fetch("/api/artist/exhibitions", { credentials: "include" }); const data = await res.json().catch(() => null); if (data) { setExhibitions(data.exhibitions ?? []); setExPublic(!!data.exhibitionsPublic); setExArtistId(data.artistId ?? null); } };
  const loadSelfExhibitions = async () => { const res = await fetch("/api/artist/self-exhibitions", { credentials: "include" }); const data = await res.json().catch(() => null); if (data?.exhibitions) setSelfExhibitions(data.exhibitions); };
  const saveSelfEx = async () => { if (selfExSaving || !selfExForm?.title?.trim()) return; setSelfExSaving(true); setSelfExMsg(null); const method = editingSelfExId ? "PATCH" : "POST"; const body = { ...(editingSelfExId ? { id: editingSelfExId } : {}), ...selfExForm }; const res = await fetch("/api/artist/self-exhibitions", { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }); const data = await res.json().catch(() => null); if (data?.ok) { setSelfExForm(null); setEditingSelfExId(null); setSelfExMsg(editingSelfExId ? "수정됨" : "전시 등록됨"); await loadSelfExhibitions(); } else { setSelfExMsg(data?.error ?? "저장 실패"); } setSelfExSaving(false); };
  const deleteSelfEx = async (id: string) => { if (!window.confirm("이 전시를 삭제하시겠습니까?")) return; const res = await fetch("/api/artist/self-exhibitions", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) }); if ((await res.json().catch(() => null))?.ok) { setSelfExMsg("삭제됨"); await loadSelfExhibitions(); } };
  const inviteArtist = async (exhibitionId: string) => { if (!inviteArtistId.trim()) return; setInviteMsg(null); const res = await fetch(`/api/artist/self-exhibitions/${exhibitionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ inviteArtistId: inviteArtistId.trim() }) }); const data = await res.json().catch(() => null); if (data?.ok) { setInviteArtistId(""); setInvitingExId(null); setInviteMsg("초대 완료"); await loadSelfExhibitions(); } else { setInviteMsg(data?.error === "artist_not_found" ? "작가를 찾을 수 없습니다" : data?.error === "already_invited" ? "이미 초대됨" : "초대 실패"); } };
  const loadSeries = async () => { const res = await fetch("/api/artist/series", { credentials: "include" }); const data = await res.json().catch(() => null); if (data?.series) setSeriesList(data.series); };
  const loadArtEvents = async () => { const res = await fetch("/api/artist/art-events", { credentials: "include" }); const data = await res.json().catch(() => null); if (data?.artEvents) setArtEvents(data.artEvents); };
  const saveArtEvent = async () => { if (artEventSaving || !artEventForm?.title?.trim() || !artEventForm.year) return; setArtEventSaving(true); setArtEventMsg(null); const method = editingArtEventId ? "PATCH" : "POST"; const body = { ...(editingArtEventId ? { id: editingArtEventId } : {}), ...artEventForm, year: Number(artEventForm.year) }; const res = await fetch("/api/artist/art-events", { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }); const data = await res.json().catch(() => null); if (data?.ok) { setArtEventForm(null); setEditingArtEventId(null); setArtEventMsg(editingArtEventId ? "수정됨" : "추가됨"); await loadArtEvents(); } else { setArtEventMsg(data?.error ?? "저장 실패"); } setArtEventSaving(false); };
  const deleteArtEvent = async (id: string) => { if (!window.confirm("이 활동을 삭제하시겠습니까?")) return; const res = await fetch("/api/artist/art-events", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) }); if ((await res.json().catch(() => null))?.ok) { setArtEventMsg("삭제됨"); await loadArtEvents(); } };
  const saveWorkNote = async () => { setWorkNoteSaving(true); setWorkNoteMsg(null); const res = await fetch("/api/profile/save", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ workNote }) }); setWorkNoteMsg(res.ok ? "저장됨" : "저장 실패"); setWorkNoteSaving(false); };
  const emptySeriesForm = () => ({ title: "", description: "", startYear: "", endYear: "", works: "", isPublic: true });
  const saveSeries = async () => { if (seriesSaving || !seriesForm?.title?.trim()) return; setSeriesSaving(true); setSeriesMsg(null); const method = editingSeriesId ? "PATCH" : "POST"; const body = { ...seriesForm, ...(editingSeriesId ? { id: editingSeriesId } : {}), startYear: seriesForm.startYear ? Number(seriesForm.startYear) : null, endYear: seriesForm.endYear ? Number(seriesForm.endYear) : null }; const res = await fetch("/api/artist/series", { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }); const data = await res.json().catch(() => null); if (data?.ok) { setSeriesForm(null); setEditingSeriesId(null); setSeriesMsg(editingSeriesId ? "수정됨" : "시리즈 추가됨"); await loadSeries(); } else { setSeriesMsg("저장 실패"); } setSeriesSaving(false); };
  const deleteSeries = async (id: string) => { if (!window.confirm("이 시리즈를 삭제하시겠습니까?")) return; const res = await fetch("/api/artist/series", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) }); if ((await res.json().catch(() => null))?.ok) { setSeriesMsg("삭제됨"); await loadSeries(); } };
  const toggleExPublic = async () => { if (exToggling) return; setExToggling(true); const next = !exPublic; setExPublic(next); await fetch("/api/artist/exhibitions", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ exhibitionsPublic: next }) }).catch(() => setExPublic(!next)); setExToggling(false); };
  const updateInviteStatus = async (id: string, status: string) => { if (adminReadOnly) return; const res = await fetch("/api/artist/invites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); const data = await res.json().catch(() => null); if (res.ok && data?.invite) setInvites((p) => p.map((i) => (i.id === id ? data.invite : i))); };

  const canSave = useMemo(() => name.trim() && artistId.trim() && startedYear.trim() && genre.trim() && country.trim() && city.trim(), [name, artistId, startedYear, genre, country, city]);

  const onToggleNotify = async (val: boolean) => {
    setNotifyPost(val);
    try { await fetch("/artist/profile/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notify_new_community_post: val }) }); }
    catch (e) { console.error(e); setNotifyPost(!val); }
  };

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

        {/* Dashboard Summary */}
        {!loadingMe && !adminReadOnly && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: "#E8E3DB", marginBottom: 40 }}>
            {[
              {
                label: lang === "ko" ? "지원 현황" : "Applications",
                value: applications.length,
                sub: applications.filter(a => a.status === "accepted").length + (lang === "ko" ? "개 수락" : " accepted"),
              },
              {
                label: lang === "ko" ? "활동 기록" : "Activities",
                value: artEvents.length,
                sub: artEvents.length > 0 ? String(Math.min(...artEvents.map(e => e.year))) + " –" : "–",
              },
              {
                label: lang === "ko" ? "임박한 마감" : "Upcoming",
                value: Object.values(openCallMap).filter(oc => {
                  const d = Date.parse(oc.deadline);
                  return d > Date.now() && d < Date.now() + 30 * 24 * 60 * 60 * 1000;
                }).length,
                sub: lang === "ko" ? "30일 이내" : "within 30 days",
              },
              {
                label: lang === "ko" ? "전시 기록" : "Exhibitions",
                value: exhibitions.length,
                sub: lang === "ko" ? "전체" : "total",
              },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: "#FFFFFF", padding: "20px 22px" }}>
                <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8A8580", marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: S, fontSize: 32, color: "#1A1A1A", lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", marginTop: 6 }}>{sub}</div>
              </div>
            ))}
          </div>
        )}

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
              {focusImprove && (
                <div id="improve-banner" style={{ marginBottom: 18, padding: "12px 16px", background: "rgba(139,115,85,0.08)", border: "1px solid rgba(139,115,85,0.35)" }}>
                  <p style={{ margin: 0, fontFamily: F, fontSize: 12, color: "#8B7355" }}>
                    {lang === "ko"
                      ? "하이라이트된 필드를 채우면 오픈콜 매칭 점수가 높아집니다."
                      : "Fill in the highlighted fields to improve your open call match score."}
                  </p>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <Lbl label="Artist ID *"><input value={artistId} onChange={(e) => setArtistId(e.target.value)} placeholder="art-0001" style={inp} /></Lbl>
                <Lbl label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inp} /></Lbl>
                <Lbl label="Start year *"><input value={startedYear} onChange={(e) => setStartedYear(e.target.value)} placeholder="2018" style={inp} /></Lbl>
                <Lbl label="Genre *"><input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Painting" style={focusImprove ? inpHighlight : inp} /></Lbl>
                <Lbl label="Country *"><select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...(focusImprove ? inpHighlight : inp), appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238A8580'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 }}><option value="">-- 선택 --</option>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Lbl>
                <Lbl label="City *"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Seoul" style={focusImprove ? inpHighlight : inp} /></Lbl>
                <Lbl label="Instagram"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" style={inp} /></Lbl>
                <Lbl label="Website"><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." style={inp} /></Lbl>
              </div>
              <Lbl label="Bio" style={{ marginTop: 18 }}><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short bio..." rows={4} style={{ ...(focusImprove ? inpHighlight : inp), width: "100%", resize: "vertical" }} /></Lbl>
              <div style={{ marginTop: 20, display: "flex", gap: 16, alignItems: "center" }}>
                <button onClick={onSaveProfile} disabled={saving} style={btnStyle(saving)}>{saving ? t("profile_saving", lang) : t("profile_save", lang)}</button>
                {saveMsg && <span style={{ fontFamily: F, fontSize: 12, color: saveMsg.includes("saved") ? "#5A7A5A" : "#8B4A4A" }}>{saveMsg}</span>}
              </div>
            </Section>

            {/* Portfolio */}
            <Section number="03" title={t("profile_portfolio", lang)}>
              {profile?.portfolioUrl && (
                <div style={{ marginBottom: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={() => { const base64 = profile.portfolioUrl!.split(",")[1]; const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0)); const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })); const a = document.createElement("a"); a.href = url; a.download = `${profile.name || "portfolio"}.pdf`; a.click(); }} style={{ padding: "12px 24px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>{t("profile_view_pdf", lang)}</button>
                  {adminReadOnly && (
                    <button onClick={async () => {
                      const reason = window.prompt("삭제 사유를 입력하세요 (사용자에게 알림으로 전달됩니다):", "포트폴리오 내용이 기준에 맞지 않아 삭제되었습니다.");
                      if (reason === null) return;
                      const res = await fetch("/api/admin/artist-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ userId: me?.session?.userId, action: "clear-portfolio", message: reason || "관리자에 의해 포트폴리오가 삭제되었습니다." }) });
                      if (res.ok) { await loadMe(); }
                    }} style={{ padding: "12px 24px", background: "#8B3A3A", color: "#FFFFFF", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>포트폴리오 삭제</button>
                  )}
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

            {/* Exhibition History */}
            <Section number="05" title={lang === "ko" ? "전시 이력" : lang === "ja" ? "展示履歴" : "Exhibition History"}>
              {exhibitions.length === 0 ? (
                <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>
                  {lang === "ko" ? "합격된 오픈콜이 여기에 자동으로 기록됩니다." : "Accepted open calls are recorded here automatically."}
                </p>
              ) : (
                <div style={{ display: "grid", gap: 1, background: "#E8E3DB", marginBottom: 20 }}>
                  {exhibitions.map((ex: any, i: number) => (
                    <div key={ex.id} style={{ background: "#FFFFFF", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8B7355" }}>{ex.country} / {ex.city}</span>
                        <p style={{ fontFamily: S, fontSize: 16, fontWeight: 400, color: "#1A1A1A", margin: "4px 0 2px" }}>{ex.galleryName}</p>
                        <p style={{ fontFamily: F, fontSize: 12, color: "#6A6660", margin: 0 }}>{ex.theme}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B0AAA2" }}>{lang === "ko" ? "합격일" : "Accepted"}</span>
                        <p style={{ fontFamily: S, fontSize: 13, color: "#1A1A1A", margin: "3px 0 0" }}>{ex.acceptedAt ? new Date(ex.acceptedAt).toLocaleDateString() : "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: F, fontSize: 12, color: "#1A1A1A" }}>
                  <button onClick={toggleExPublic} disabled={exToggling} style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, border: "none", background: exPublic ? "#1A1A1A" : "#D8D3CB", cursor: "pointer", position: "relative" }}>
                    <span style={{ position: "absolute", top: 2, left: exPublic ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#FFFFFF", transition: "left 0.15s" }} />
                  </button>
                  {lang === "ko" ? "전시 이력 공개" : "Make exhibition history public"}
                </label>
                {exPublic && exArtistId && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: F, fontSize: 11, color: "#8B7355" }}>
                      {typeof window !== "undefined" ? `${window.location.origin}/artist/public/${exArtistId}` : `/artist/public/${exArtistId}`}
                    </span>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/artist/public/${exArtistId}`); setExCopied(true); setTimeout(() => setExCopied(false), 2000); }} style={{ padding: "5px 12px", border: "1px solid #C8B4A0", background: "#FFFFFF", fontFamily: F, fontSize: 10, fontWeight: 600, color: exCopied ? "#3D6B3D" : "#8B7355", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                      {exCopied ? (lang === "ko" ? "복사됨 ✓" : "Copied ✓") : (lang === "ko" ? "복사" : "Copy")}
                    </button>
                    <a href={`/artist/public/${exArtistId}/cv`} target="_blank" rel="noreferrer" style={{ padding: "5px 12px", border: "1px solid #D4C9B8", background: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 600, color: "#8B7355", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", textDecoration: "none" }}>
                      CV
                    </a>
                    <a href={`/artist/public/${exArtistId}?showOnboarding=1`} style={{ padding: "5px 12px", border: "1px solid #D4C9B8", background: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 600, color: "#8B7355", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", textDecoration: "none" }}>
                      {lang === "ko" ? "온보딩 다시 보기" : "Replay onboarding"}
                    </a>
                  </div>
                )}
              </div>
            </Section>

            {/* Work Note */}
            <Section number="06" title={lang === "ko" ? "작업 노트" : "Work Note"}>
              <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginBottom: 14 }}>
                {lang === "ko" ? "이 작업은 왜 하는가, 어떤 문제의식에서 출발했는가, 작업 방향은 무엇인가 — 자유롭게 기록하세요. 공개 프로필에 표시됩니다." : "Why do you make this work? What drives it? Write freely — this appears on your public profile."}
              </p>
              <textarea
                value={workNote}
                onChange={(e) => setWorkNote(e.target.value)}
                placeholder={lang === "ko" ? "작업 노트를 입력하세요..." : "Write your work note..."}
                rows={6}
                style={{ ...inp, width: "100%", resize: "vertical" }}
              />
              <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
                <button onClick={saveWorkNote} disabled={workNoteSaving} style={btnStyle(workNoteSaving)}>
                  {workNoteSaving ? (lang === "ko" ? "저장 중..." : "Saving...") : (lang === "ko" ? "저장" : "Save")}
                </button>
                {workNoteMsg && <span style={{ fontFamily: F, fontSize: 12, color: workNoteMsg.includes("실패") ? "#8B4A4A" : "#5A7A5A" }}>{workNoteMsg}</span>}
              </div>
            </Section>

            {/* Artwork Series */}
            <Section number="07" title={lang === "ko" ? "작업 시리즈" : "Artwork Series"}>
              <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginBottom: 16 }}>
                {lang === "ko" ? "연작이나 시리즈 단위로 작업을 묶어 맥락을 구조화하세요. 공개로 설정하면 공개 프로필에 표시됩니다." : "Group your works into series to structure context. Public series appear on your public profile."}
              </p>
              {seriesList.length > 0 && (
                <div style={{ display: "grid", gap: 1, background: "#E8E3DB", marginBottom: 20 }}>
                  {seriesList.map((s) => (
                    <div key={s.id} style={{ background: "#FFFFFF", padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: S, fontSize: 16, fontWeight: 400, color: "#1A1A1A" }}>{s.title}</span>
                            {(s.startYear || s.endYear) && <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{s.startYear ?? "?"} — {s.endYear ?? "현재"}</span>}
                            <span style={{ fontFamily: F, fontSize: 9, padding: "2px 8px", border: "1px solid #E8E3DB", color: s.isPublic ? "#5A7A5A" : "#8A8580" }}>{s.isPublic ? (lang === "ko" ? "공개" : "Public") : (lang === "ko" ? "비공개" : "Private")}</span>
                          </div>
                          {s.description && <p style={{ fontFamily: F, fontSize: 12, color: "#6A6660", margin: "6px 0 0" }}>{s.description}</p>}
                          {s.works && <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{s.works}</p>}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button onClick={() => { setEditingSeriesId(s.id); setSeriesForm({ title: s.title, description: s.description ?? "", startYear: s.startYear ? String(s.startYear) : "", endYear: s.endYear ? String(s.endYear) : "", works: s.works ?? "", isPublic: s.isPublic }); }} style={{ padding: "6px 12px", border: "1px solid #E8E3DB", background: "transparent", fontFamily: F, fontSize: 10, color: "#8A8580", cursor: "pointer" }}>{lang === "ko" ? "수정" : "Edit"}</button>
                          <button onClick={() => deleteSeries(s.id)} style={{ padding: "6px 12px", border: "1px solid #C8A0A0", background: "transparent", fontFamily: F, fontSize: 10, color: "#8B4A4A", cursor: "pointer" }}>{lang === "ko" ? "삭제" : "Delete"}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {seriesMsg && <p style={{ fontFamily: F, fontSize: 12, color: seriesMsg.includes("실패") ? "#8B4A4A" : "#5A7A5A", marginBottom: 12 }}>{seriesMsg}</p>}
              {seriesForm ? (
                <div style={{ border: "1px solid #E8E3DB", padding: 24, background: "#FDFBF7" }}>
                  <p style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B7355", marginBottom: 16 }}>{editingSeriesId ? (lang === "ko" ? "시리즈 수정" : "Edit Series") : (lang === "ko" ? "새 시리즈" : "New Series")}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <Lbl label={lang === "ko" ? "제목 *" : "Title *"}><input value={seriesForm.title} onChange={(e) => setSeriesForm(f => f ? { ...f, title: e.target.value } : f)} placeholder={lang === "ko" ? "시리즈 제목" : "Series title"} style={inp} /></Lbl>
                    <Lbl label={lang === "ko" ? "시작 연도" : "Start Year"}><input value={seriesForm.startYear} onChange={(e) => setSeriesForm(f => f ? { ...f, startYear: e.target.value } : f)} placeholder="2020" style={inp} /></Lbl>
                    <Lbl label={lang === "ko" ? "종료 연도" : "End Year"}><input value={seriesForm.endYear} onChange={(e) => setSeriesForm(f => f ? { ...f, endYear: e.target.value } : f)} placeholder={lang === "ko" ? "진행 중이면 비워두세요" : "Leave blank if ongoing"} style={inp} /></Lbl>
                    <Lbl label={lang === "ko" ? "공개 여부" : "Visibility"}>
                      <select value={seriesForm.isPublic ? "1" : "0"} onChange={(e) => setSeriesForm(f => f ? { ...f, isPublic: e.target.value === "1" } : f)} style={{ ...inp, appearance: "none" }}>
                        <option value="1">{lang === "ko" ? "공개" : "Public"}</option>
                        <option value="0">{lang === "ko" ? "비공개" : "Private"}</option>
                      </select>
                    </Lbl>
                  </div>
                  <Lbl label={lang === "ko" ? "설명" : "Description"} style={{ marginBottom: 14 }}><textarea value={seriesForm.description} onChange={(e) => setSeriesForm(f => f ? { ...f, description: e.target.value } : f)} rows={3} placeholder={lang === "ko" ? "이 시리즈의 개념이나 맥락을 설명하세요" : "Describe the concept or context of this series"} style={{ ...inp, width: "100%", resize: "vertical" }} /></Lbl>
                  <Lbl label={lang === "ko" ? "작품 목록" : "Works"}><textarea value={seriesForm.works} onChange={(e) => setSeriesForm(f => f ? { ...f, works: e.target.value } : f)} rows={3} placeholder={lang === "ko" ? "작품 제목을 줄바꿈으로 구분해 입력하세요" : "One work title per line"} style={{ ...inp, width: "100%", resize: "vertical" }} /></Lbl>
                  <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                    <button onClick={saveSeries} disabled={seriesSaving || !seriesForm.title.trim()} style={btnStyle(seriesSaving || !seriesForm.title.trim())}>{seriesSaving ? "..." : (lang === "ko" ? "저장" : "Save")}</button>
                    <button onClick={() => { setSeriesForm(null); setEditingSeriesId(null); }} style={{ padding: "14px 24px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 11, cursor: "pointer" }}>{lang === "ko" ? "취소" : "Cancel"}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setSeriesForm(emptySeriesForm()); setEditingSeriesId(null); setSeriesMsg(null); }} style={{ padding: "12px 24px", border: "1px dashed #D4C9B8", background: "transparent", color: "#8B7355", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                  + {lang === "ko" ? "시리즈 추가" : "Add Series"}
                </button>
              )}
            </Section>

            {/* Self-registered Exhibitions */}
            <Section number="08" title={lang === "ko" ? "전시 등록" : "Register Exhibition"}>
              <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginBottom: 16 }}>
                {lang === "ko" ? "직접 참여한 전시를 등록하고 다른 작가를 초대해 연결하세요." : "Register exhibitions you participated in and invite other artists."}
              </p>
              {selfExhibitions.length > 0 && (
                <div style={{ display: "grid", gap: 1, background: "#E8E3DB", marginBottom: 20 }}>
                  {selfExhibitions.map((ex) => (
                    <div key={ex.id} style={{ background: "#FFFFFF", padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontFamily: S, fontSize: 16, fontWeight: 400, color: "#1A1A1A" }}>{ex.title}</span>
                            <span style={{ fontFamily: F, fontSize: 9, padding: "2px 8px", border: "1px solid #E8E3DB", color: ex.isPublic ? "#5A7A5A" : "#8A8580" }}>{ex.isPublic ? (lang === "ko" ? "공개" : "Public") : (lang === "ko" ? "비공개" : "Private")}</span>
                            {ex.isPublic && <a href={`/exhibitions/${ex.id}`} target="_blank" rel="noreferrer" style={{ fontFamily: F, fontSize: 9, color: "#8B7355", letterSpacing: "0.08em", textDecoration: "none" }}>↗ {lang === "ko" ? "공개 페이지" : "View"}</a>}
                          </div>
                          {(ex.city || ex.country) && <span style={{ fontFamily: F, fontSize: 10, color: "#8B7355", letterSpacing: "0.06em" }}>{[ex.city, ex.country].filter(Boolean).join(", ")}</span>}
                          {(ex.startDate || ex.endDate) && <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", margin: "4px 0 0" }}>{ex.startDate ? new Date(ex.startDate).toLocaleDateString() : "?"} — {ex.endDate ? new Date(ex.endDate).toLocaleDateString() : (lang === "ko" ? "진행 중" : "ongoing")}</p>}
                          {ex.space && <p style={{ fontFamily: F, fontSize: 11, color: "#6A6660", margin: "4px 0 0" }}>{lang === "ko" ? "공간: " : "Space: "}{ex.space.name}</p>}
                          {ex.curator && <p style={{ fontFamily: F, fontSize: 11, color: "#6A6660", margin: "2px 0 0" }}>{lang === "ko" ? "큐레이터: " : "Curator: "}{ex.curator.name}{ex.curator.organization ? ` (${ex.curator.organization})` : ""}</p>}
                          {ex.artists.length > 0 && (
                            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {ex.artists.map((a) => (
                                <span key={a.id} style={{ fontFamily: F, fontSize: 9, padding: "2px 8px", background: a.status === "confirmed" ? "rgba(90,122,90,0.1)" : a.status === "invited" ? "rgba(139,115,85,0.1)" : "rgba(200,160,160,0.1)", border: `1px solid ${a.status === "confirmed" ? "#5A7A5A" : a.status === "invited" ? "#8B7355" : "#C8A0A0"}`, color: a.status === "confirmed" ? "#3A6A3A" : a.status === "invited" ? "#6B5535" : "#8B4A4A" }}>
                                  {a.artist.name} · {a.status}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* 작가 초대 UI */}
                          {invitingExId === ex.id ? (
                            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <input value={inviteArtistId} onChange={(e) => setInviteArtistId(e.target.value)} placeholder={lang === "ko" ? "작가 ID (예: art-0001)" : "Artist ID (e.g. art-0001)"} style={{ ...inp, width: 200 }} onKeyDown={(e) => { if (e.key === "Enter") inviteArtist(ex.id); }} />
                              <button onClick={() => inviteArtist(ex.id)} style={{ padding: "10px 20px", border: "none", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>{lang === "ko" ? "초대" : "Invite"}</button>
                              <button onClick={() => { setInvitingExId(null); setInviteArtistId(""); setInviteMsg(null); }} style={{ padding: "10px 16px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, cursor: "pointer" }}>{lang === "ko" ? "취소" : "Cancel"}</button>
                              {inviteMsg && <span style={{ fontFamily: F, fontSize: 11, color: inviteMsg.includes("완료") ? "#5A7A5A" : "#8B4A4A" }}>{inviteMsg}</span>}
                            </div>
                          ) : (
                            <button onClick={() => { setInvitingExId(ex.id); setInviteArtistId(""); setInviteMsg(null); }} style={{ marginTop: 10, padding: "6px 14px", border: "1px dashed #D4C9B8", background: "transparent", color: "#8B7355", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                              + {lang === "ko" ? "작가 초대" : "Invite Artist"}
                            </button>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button onClick={() => { setEditingSelfExId(ex.id); setSelfExForm({ title: ex.title, startDate: ex.startDate ? ex.startDate.slice(0, 10) : "", endDate: ex.endDate ? ex.endDate.slice(0, 10) : "", city: ex.city ?? "", country: ex.country ?? "", description: ex.description ?? "", isPublic: ex.isPublic, spaceName: ex.space?.name ?? "", spaceType: "", spaceWebsite: ex.space?.website ?? "", curatorName: ex.curator?.name ?? "", curatorOrganization: ex.curator?.organization ?? "" }); setSelfExMsg(null); }} style={{ padding: "6px 12px", border: "1px solid #E8E3DB", background: "transparent", fontFamily: F, fontSize: 10, color: "#8A8580", cursor: "pointer" }}>{lang === "ko" ? "수정" : "Edit"}</button>
                          <button onClick={() => deleteSelfEx(ex.id)} style={{ padding: "6px 12px", border: "1px solid #C8A0A0", background: "transparent", fontFamily: F, fontSize: 10, color: "#8B4A4A", cursor: "pointer" }}>{lang === "ko" ? "삭제" : "Delete"}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selfExMsg && <p style={{ fontFamily: F, fontSize: 12, color: selfExMsg.includes("실패") || selfExMsg.includes("not") ? "#8B4A4A" : "#5A7A5A", marginBottom: 12 }}>{selfExMsg}</p>}
              {selfExForm ? (
                <div style={{ border: "1px solid #E8E3DB", padding: 24, background: "#FDFBF7" }}>
                  <p style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B7355", marginBottom: 16 }}>{editingSelfExId ? (lang === "ko" ? "전시 수정" : "Edit Exhibition") : (lang === "ko" ? "새 전시 등록" : "New Exhibition")}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <Lbl label={lang === "ko" ? "전시명 *" : "Title *"} style={{ gridColumn: "1 / -1" }}><input value={selfExForm.title} onChange={(e) => setSelfExForm(f => f ? { ...f, title: e.target.value } : f)} placeholder={lang === "ko" ? "전시 제목" : "Exhibition title"} style={inp} /></Lbl>
                    <Lbl label={lang === "ko" ? "시작일" : "Start Date"}><input type="date" value={selfExForm.startDate} onChange={(e) => setSelfExForm(f => f ? { ...f, startDate: e.target.value } : f)} style={inp} /></Lbl>
                    <Lbl label={lang === "ko" ? "종료일" : "End Date"}><input type="date" value={selfExForm.endDate} onChange={(e) => setSelfExForm(f => f ? { ...f, endDate: e.target.value } : f)} style={inp} /></Lbl>
                    <Lbl label={lang === "ko" ? "도시" : "City"}><input value={selfExForm.city} onChange={(e) => setSelfExForm(f => f ? { ...f, city: e.target.value } : f)} placeholder="Seoul" style={inp} /></Lbl>
                    <Lbl label={lang === "ko" ? "국가" : "Country"}><input value={selfExForm.country} onChange={(e) => setSelfExForm(f => f ? { ...f, country: e.target.value } : f)} placeholder="South Korea" style={inp} /></Lbl>
                  </div>
                  <Lbl label={lang === "ko" ? "설명" : "Description"} style={{ marginBottom: 14 }}><textarea value={selfExForm.description} onChange={(e) => setSelfExForm(f => f ? { ...f, description: e.target.value } : f)} rows={3} placeholder={lang === "ko" ? "전시 소개 (선택)" : "Exhibition description (optional)"} style={{ ...inp, width: "100%", resize: "vertical" }} /></Lbl>
                  <p style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", margin: "16px 0 12px" }}>{lang === "ko" ? "전시 공간" : "Space"}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <Lbl label={lang === "ko" ? "공간 이름" : "Space Name"}><input value={selfExForm.spaceName} onChange={(e) => setSelfExForm(f => f ? { ...f, spaceName: e.target.value } : f)} placeholder={lang === "ko" ? "갤러리명 또는 공간명" : "Gallery or venue name"} style={inp} /></Lbl>
                    <Lbl label={lang === "ko" ? "공간 유형" : "Space Type"}>
                      <select value={selfExForm.spaceType} onChange={(e) => setSelfExForm(f => f ? { ...f, spaceType: e.target.value } : f)} style={{ ...inp, appearance: "none" }}>
                        <option value="">-- {lang === "ko" ? "선택" : "Select"} --</option>
                        <option value="gallery">Gallery</option>
                        <option value="museum">Museum</option>
                        <option value="art_fair">Art Fair</option>
                        <option value="alternative">Alternative Space</option>
                        <option value="online">Online</option>
                        <option value="other">Other</option>
                      </select>
                    </Lbl>
                    <Lbl label={lang === "ko" ? "공간 웹사이트" : "Space Website"} style={{ gridColumn: "1 / -1" }}><input value={selfExForm.spaceWebsite} onChange={(e) => setSelfExForm(f => f ? { ...f, spaceWebsite: e.target.value } : f)} placeholder="https://..." style={inp} /></Lbl>
                  </div>
                  <p style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", margin: "16px 0 12px" }}>{lang === "ko" ? "큐레이터" : "Curator"}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <Lbl label={lang === "ko" ? "큐레이터 이름" : "Curator Name"}><input value={selfExForm.curatorName} onChange={(e) => setSelfExForm(f => f ? { ...f, curatorName: e.target.value } : f)} placeholder={lang === "ko" ? "이름 (선택)" : "Name (optional)"} style={inp} /></Lbl>
                    <Lbl label={lang === "ko" ? "소속" : "Organization"}><input value={selfExForm.curatorOrganization} onChange={(e) => setSelfExForm(f => f ? { ...f, curatorOrganization: e.target.value } : f)} placeholder={lang === "ko" ? "소속 기관 (선택)" : "Organization (optional)"} style={inp} /></Lbl>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: F, fontSize: 12, color: "#1A1A1A", marginBottom: 16 }}>
                    <input type="checkbox" checked={selfExForm.isPublic} onChange={(e) => setSelfExForm(f => f ? { ...f, isPublic: e.target.checked } : f)} />
                    {lang === "ko" ? "공개 프로필에 표시" : "Show on public profile"}
                  </label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={saveSelfEx} disabled={selfExSaving || !selfExForm.title.trim()} style={btnStyle(selfExSaving || !selfExForm.title.trim())}>{selfExSaving ? "..." : (lang === "ko" ? "저장" : "Save")}</button>
                    <button onClick={() => { setSelfExForm(null); setEditingSelfExId(null); }} style={{ padding: "14px 24px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 11, cursor: "pointer" }}>{lang === "ko" ? "취소" : "Cancel"}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setSelfExForm(emptySelfExForm()); setEditingSelfExId(null); setSelfExMsg(null); }} style={{ padding: "12px 24px", border: "1px dashed #D4C9B8", background: "transparent", color: "#8B7355", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                  + {lang === "ko" ? "전시 등록" : "Add Exhibition"}
                </button>
              )}
            </Section>

            {/* Activity Timeline */}
            <Section number="09" title={lang === "ko" ? "활동 타임라인" : "Activity Timeline"}>
              {artEventMsg && <p style={{ fontFamily: F, fontSize: 11, color: "#8B7355", marginBottom: 12 }}>{artEventMsg}</p>}
              {artEvents.length > 0 && (
                <div style={{ display: "grid", gap: 1, background: "#E8E3DB", marginBottom: 20 }}>
                  {artEvents.map((ev) => (
                    <div key={ev.id} style={{ background: "#FFFFFF", padding: "16px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355", padding: "2px 8px", background: "rgba(139,115,85,0.07)" }}>{ev.eventType}</span>
                          <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{ev.year}</span>
                          {!ev.isPublic && <span style={{ fontFamily: F, fontSize: 9, color: "#B0AAA2" }}>비공개</span>}
                        </div>
                        <p style={{ fontFamily: S, fontSize: 17, fontWeight: 400, color: "#1A1A1A", margin: "0 0 2px" }}>{ev.title}</p>
                        {ev.description && <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", margin: 0 }}>{ev.description}</p>}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => { setArtEventForm({ eventType: ev.eventType, title: ev.title, year: String(ev.year), description: ev.description ?? "", isPublic: ev.isPublic }); setEditingArtEventId(ev.id); setArtEventMsg(null); }} style={{ padding: "6px 14px", border: "1px solid #E8E3DB", background: "transparent", color: "#6A6660", fontFamily: F, fontSize: 10, cursor: "pointer" }}>Edit</button>
                        <button onClick={() => deleteArtEvent(ev.id)} style={{ padding: "6px 14px", border: "1px solid #E8C8C8", background: "transparent", color: "#8B4A4A", fontFamily: F, fontSize: 10, cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {artEventForm ? (
                <div style={{ border: "1px solid #E8E3DB", padding: 24, background: "#FDFBF7" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <Lbl label={lang === "ko" ? "유형" : "Type"}>
                      <select value={artEventForm.eventType} onChange={(e) => setArtEventForm(f => f ? { ...f, eventType: e.target.value } : f)} style={{ ...inp }}>
                        <option value="exhibition">Exhibition</option>
                        <option value="collaboration">Collaboration</option>
                        <option value="publication">Publication</option>
                        <option value="series_start">Series Start</option>
                        <option value="residency">Residency</option>
                        <option value="award">Award</option>
                        <option value="grant">Grant</option>
                        <option value="opencall_result">Open Call Result</option>
                        <option value="press">Press / Media</option>
                      </select>
                    </Lbl>
                    <Lbl label={lang === "ko" ? "연도" : "Year"}><input type="number" value={artEventForm.year} onChange={(e) => setArtEventForm(f => f ? { ...f, year: e.target.value } : f)} placeholder="2024" style={inp} /></Lbl>
                  </div>
                  <Lbl label={lang === "ko" ? "제목" : "Title"} style={{ marginBottom: 14 }}><input value={artEventForm.title} onChange={(e) => setArtEventForm(f => f ? { ...f, title: e.target.value } : f)} placeholder={lang === "ko" ? "활동 제목" : "Activity title"} style={inp} /></Lbl>
                  <Lbl label={lang === "ko" ? "설명 (선택)" : "Description (optional)"} style={{ marginBottom: 14 }}><textarea value={artEventForm.description} onChange={(e) => setArtEventForm(f => f ? { ...f, description: e.target.value } : f)} rows={2} style={{ ...inp, resize: "vertical" }} /></Lbl>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: F, fontSize: 12, color: "#1A1A1A", marginBottom: 16 }}>
                    <input type="checkbox" checked={artEventForm.isPublic} onChange={(e) => setArtEventForm(f => f ? { ...f, isPublic: e.target.checked } : f)} />
                    {lang === "ko" ? "공개 프로필에 표시" : "Show on public profile"}
                  </label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={saveArtEvent} disabled={artEventSaving || !artEventForm.title.trim()} style={btnStyle(artEventSaving || !artEventForm.title.trim())}>{artEventSaving ? "..." : (lang === "ko" ? "저장" : "Save")}</button>
                    <button onClick={() => { setArtEventForm(null); setEditingArtEventId(null); }} style={{ padding: "14px 24px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 11, cursor: "pointer" }}>{lang === "ko" ? "취소" : "Cancel"}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setArtEventForm(emptyArtEventForm()); setEditingArtEventId(null); setArtEventMsg(null); }} style={{ padding: "12px 24px", border: "1px dashed #D4C9B8", background: "transparent", color: "#8B7355", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                  + {lang === "ko" ? "활동 추가" : "Add Activity"}
                </button>
              )}
            </Section>

            {/* Notifications */}
            <Section number="10" title="Notifications">
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: F, fontSize: 13, color: "#1A1A1A" }}>
                <input type="checkbox" checked={notifyPost} onChange={(e) => onToggleNotify(e.target.checked)} />
                새 커뮤니티 글 알림 받기
              </label>
            </Section>

            {/* Invites */}
            <Section number="11" title={t("profile_invites", lang)}>
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
