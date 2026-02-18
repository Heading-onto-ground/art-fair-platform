"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { CardSkeleton } from "@/app/components/Skeleton";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";

type Role = "artist" | "gallery";

type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

type ChatRoom = {
  id: string;
  openCallId: string;
  artistId: string;
  galleryId: string;
  messages: { createdAt: number; text: string; senderId: string }[];
};

type OpenCall = {
  id: string;
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
  exhibitionDate?: string;
  deadline: string;
  posterImage?: string | null;
  createdAt: number;
};

type Application = {
  id: string;
  openCallId: string;
  artistId: string;
  artistName: string;
  artistPortfolioUrl?: string;
  status: "submitted" | "reviewing" | "accepted" | "rejected";
  createdAt: number;
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

type InviteTemplates = {
  galleryId: string;
  korea: string;
  japan: string;
  global: string;
  updatedAt: number;
};

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch {
    return null;
  }
}

export default function GalleryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const isAdminView = searchParams.get("adminView") === "1";
  const createMode = searchParams.get("create") === "1";
  const targetOpenCallId = String(searchParams.get("openCallId") || "").trim();
  const [adminReadOnly, setAdminReadOnly] = useState(false);
  const openCallItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [me, setMe] = useState<MeResponse | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [templates, setTemplates] = useState<InviteTemplates | null>(null);
  const [tplSaving, setTplSaving] = useState(false);
  const [tplMsg, setTplMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ocForm, setOcForm] = useState({
    gallery: "",
    city: "",
    country: "한국",
    theme: "",
    exhibitionDate: "",
    deadline: "",
  });
  const [ocPosterPreview, setOcPosterPreview] = useState<string | null>(null);
  const [ocPosterData, setOcPosterData] = useState<string | null>(null);
  const [savingOC, setSavingOC] = useState(false);
  const [ocMsg, setOcMsg] = useState<string | null>(null);
  const [uploadingPosterId, setUploadingPosterId] = useState<string | null>(null);
  const [translatedThemeById, setTranslatedThemeById] = useState<Record<string, string>>({});
  const [showOriginalById, setShowOriginalById] = useState<Record<string, boolean>>({});
  const [translatingById, setTranslatingById] = useState<Record<string, boolean>>({});
  const [focusedOpenCallId, setFocusedOpenCallId] = useState<string | null>(null);

  const session = me?.session;

  const headers = useMemo(() => {
    if (!session) return {};
    return {
      "x-user-id": session.userId,
      "x-user-role": session.role,
    };
  }, [session]);

  async function loadChats(h: Record<string, string>) {
    const res = await fetch("/api/chats", { headers: h, cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    return Array.isArray(data?.rooms) ? (data.rooms as ChatRoom[]) : [];
  }

  async function loadOpenCalls() {
    const res = await fetch("/api/open-calls", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    const all = Array.isArray(data?.openCalls) ? (data.openCalls as OpenCall[]) : [];
    return all;
  }

  async function loadInvites() {
    const res = await fetch("/api/gallery/invites", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    return Array.isArray(data?.invites) ? (data.invites as Invite[]) : [];
  }

  async function loadApplications() {
    const res = await fetch("/api/applications", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    return Array.isArray(data?.applications) ? (data.applications as Application[]) : [];
  }

  async function loadTemplates() {
    const res = await fetch("/api/gallery/invite-templates", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    return (data?.templates ?? null) as InviteTemplates | null;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      if (isAdminView) {
        const adminRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" }).catch(() => null);
        const adminData = adminRes ? await adminRes.json().catch(() => null) : null;
        if (adminData?.authenticated) {
          setAdminReadOnly(true);
          setMe({ session: { userId: "__admin_preview__", role: "gallery" }, profile: null });
          try {
            const allOCs = await loadOpenCalls();
            setOpenCalls(allOCs);
          } catch {
            setOpenCalls([]);
          } finally {
            setRooms([]);
            setInvites([]);
            setApplications([]);
            setTemplates(null);
            setLoading(false);
          }
          return;
        }
      }

      const m = await fetchMe();
      const r = m?.session?.role;

      if (!r) {
        router.replace("/login?role=gallery");
        return;
      }
      if (r !== "gallery") {
        router.replace("/artist");
        return;
      }

      setMe(m);
      const profile = m?.profile ?? null;
      setOcForm((p) => ({
        ...p,
        gallery: profile?.name ?? p.gallery,
      }));

      try {
        const [list, allOCs, apps, inv, tpl] = await Promise.all([
          loadChats({
            "x-user-id": m!.session!.userId,
            "x-user-role": m!.session!.role,
          }),
          loadOpenCalls(),
          loadApplications(),
          loadInvites(),
          loadTemplates(),
        ]);
        setRooms(list);
        setOpenCalls(allOCs.filter((o) => o.galleryId === m!.session!.userId));
        setApplications(apps);
        setInvites(inv);
        setTemplates(tpl);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load chats");
        setRooms([]);
        setOpenCalls([]);
        setApplications([]);
        setInvites([]);
        setTemplates(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [router, isAdminView]);

  async function refresh() {
    if (adminReadOnly) {
      setErr(null);
      try {
        const allOCs = await loadOpenCalls();
        setOpenCalls(allOCs);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load open calls");
      }
      return;
    }
    if (!session) return;
    setErr(null);
    try {
      const [list, allOCs, apps, inv, tpl] = await Promise.all([
        loadChats(headers as Record<string, string>),
        loadOpenCalls(),
        loadApplications(),
        loadInvites(),
        loadTemplates(),
      ]);
      setRooms(list);
      setOpenCalls(allOCs.filter((o) => o.galleryId === session.userId));
      setApplications(apps);
      setInvites(inv);
      setTemplates(tpl);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load chats");
      setRooms([]);
      setOpenCalls([]);
      setApplications([]);
      setInvites([]);
      setTemplates(null);
    }
  }

  async function updateInviteStatus(id: string, status: Invite["status"]) {
    if (adminReadOnly) return;
    const res = await fetch(`/api/gallery/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.invite) {
      setInvites((prev) =>
        prev.map((i) => (i.id === id ? (data.invite as Invite) : i))
      );
    }
  }

  async function saveTemplates() {
    if (adminReadOnly) {
      setTplMsg(lang === "ko" ? "관리자 미리보기 모드에서는 저장할 수 없습니다." : "Save is disabled in admin preview mode.");
      return;
    }
    if (!templates) return;
    setTplSaving(true);
    setTplMsg(null);
    try {
      const res = await fetch("/api/gallery/invite-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          korea: templates.korea,
          japan: templates.japan,
          global: templates.global,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.templates) {
        setTplMsg(data?.error ?? "Failed to save templates");
        return;
      }
      setTemplates(data.templates as InviteTemplates);
      setTplMsg("Saved successfully");
    } catch {
      setTplMsg("Server error");
    } finally {
      setTplSaving(false);
    }
  }

  async function createOpenCall() {
    if (adminReadOnly) {
      setOcMsg(lang === "ko" ? "관리자 미리보기 모드에서는 오픈콜을 생성할 수 없습니다." : "Create is disabled in admin preview mode.");
      return;
    }
    if (!session) return;
    setOcMsg(null);
    setSavingOC(true);
    try {
      const payload: any = {
        gallery: ocForm.gallery.trim(),
        city: ocForm.city.trim(),
        country: ocForm.country.trim(),
        theme: ocForm.theme.trim(),
        exhibitionDate: ocForm.exhibitionDate.trim(),
        deadline: ocForm.deadline.trim(),
      };
      if (ocPosterData) payload.posterImage = ocPosterData;
      const res = await fetch("/api/open-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.openCall) {
        throw new Error(data?.error ?? `Failed to create (${res.status})`);
      }
      setOpenCalls((p) => [data.openCall as OpenCall, ...p]);
      setOcForm((p) => ({ ...p, city: "", country: "", theme: "", exhibitionDate: "", deadline: "" }));
      setOcPosterPreview(null);
      setOcPosterData(null);
      setOcMsg("Open call published successfully");
    } catch (e: any) {
      setOcMsg(e?.message ?? "Failed to publish open call");
    } finally {
      setSavingOC(false);
    }
  }

  function handlePosterSelect(e: React.ChangeEvent<HTMLInputElement>, mode: "create" | string) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert(lang === "ko" ? "이미지가 너무 큽니다 (최대 5MB)" : "Image too large (max 5MB)"); return; }

    resizeImage(file, 800, 1100, 0.82).then((dataUri) => {
      if (mode === "create") {
        setOcPosterPreview(dataUri);
        setOcPosterData(dataUri);
      } else {
        // Upload to existing open call
        uploadPosterToExisting(mode, dataUri);
      }
    });
  }

  async function uploadPosterToExisting(openCallId: string, dataUri: string) {
    if (adminReadOnly) {
      alert(lang === "ko" ? "관리자 미리보기 모드에서는 업로드할 수 없습니다." : "Upload is disabled in admin preview mode.");
      return;
    }
    setUploadingPosterId(openCallId);
    try {
      const res = await fetch(`/api/open-calls/${openCallId}/poster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: dataUri }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Upload failed");
        return;
      }
      setOpenCalls((prev) =>
        prev.map((o) => (o.id === openCallId ? { ...o, posterImage: dataUri } : o))
      );
    } catch {
      alert("Upload failed");
    } finally {
      setUploadingPosterId(null);
    }
  }

  async function translateTheme(openCall: OpenCall) {
    if (lang === "en") return;
    if (translatedThemeById[openCall.id]) {
      setShowOriginalById((prev) => ({ ...prev, [openCall.id]: !prev[openCall.id] }));
      return;
    }
    setTranslatingById((prev) => ({ ...prev, [openCall.id]: true }));
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: openCall.theme, targetLang: lang }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.translated) {
        setTranslatedThemeById((prev) => ({ ...prev, [openCall.id]: String(data.translated) }));
        setShowOriginalById((prev) => ({ ...prev, [openCall.id]: false }));
      }
    } finally {
      setTranslatingById((prev) => ({ ...prev, [openCall.id]: false }));
    }
  }

  useEffect(() => {
    if (lang === "en" || openCalls.length === 0) return;
    const targets = openCalls.filter((o) => !translatedThemeById[o.id]).slice(0, 20);
    if (targets.length === 0) return;
    (async () => {
      for (const item of targets) {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: item.theme, targetLang: lang }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.translated) {
          setTranslatedThemeById((prev) => ({ ...prev, [item.id]: String(data.translated) }));
        }
      }
    })();
  }, [openCalls, lang, translatedThemeById]);

  useEffect(() => {
    if (!targetOpenCallId || openCalls.length === 0) return;
    if (!openCalls.some((o) => o.id === targetOpenCallId)) return;
    setFocusedOpenCallId(targetOpenCallId);
    const el = openCallItemRefs.current[targetOpenCallId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const timer = window.setTimeout(() => setFocusedOpenCallId((prev) => (prev === targetOpenCallId ? null : prev)), 4200);
    return () => window.clearTimeout(timer);
  }, [targetOpenCallId, openCalls]);

  const applicantCountByOpenCall = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of applications) {
      map[a.openCallId] = (map[a.openCallId] || 0) + 1;
    }
    return map;
  }, [applications]);

  const newApplicantCountByOpenCall = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of applications) {
      if (a.status !== "submitted") continue;
      map[a.openCallId] = (map[a.openCallId] || 0) + 1;
    }
    return map;
  }, [applications]);

  const totalNewApplicants = useMemo(
    () => applications.filter((a) => a.status === "submitted").length,
    [applications]
  );

  const openCallThemeById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of openCalls) map[o.id] = o.theme;
    return map;
  }, [openCalls]);

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 1000, margin: "48px auto", padding: "0 40px" }}>
          <div style={{ padding: "clamp(20px, 3vw, 48px)" }}>
            <CardSkeleton count={4} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 40px" }}>
        {adminReadOnly && (
          <div style={{ marginBottom: 20, padding: "12px 14px", border: "1px solid #E8E3DB", background: "#FAF8F4", color: "#8A8580", fontFamily: F, fontSize: 11, letterSpacing: "0.04em" }}>
            {lang === "ko" ? "관리자 미리보기 모드 (읽기 전용)" : "Admin preview mode (read-only)"}
          </div>
        )}
        {/* Header - Margiela Style */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
          <div>
            <span
              style={{
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#8A8A8A",
              }}
            >
              {t("gallery_dashboard", lang)}
            </span>
            <h1
              style={{
                fontFamily: S,
                fontSize: 42,
                fontWeight: 300,
                color: "#1A1A1A",
                marginTop: 8,
                letterSpacing: "-0.01em",
              }}
            >
              {t("gallery_page_title", lang)}
            </h1>
            <p
              style={{
                fontFamily: F,
                fontSize: 12,
                color: "#8A8A8A",
                marginTop: 8,
                letterSpacing: "0.02em",
              }}
            >
              Signed in: {session?.userId}
            </p>
            <p style={{ fontFamily: F, fontSize: 11, color: "#8A8A8A", marginTop: 8 }}>
              {lang === "ko"
                ? `신규 지원자 ${totalNewApplicants}명`
                : lang === "ja"
                  ? `新規応募 ${totalNewApplicants}件`
                  : `New applicants: ${totalNewApplicants}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push(createMode ? "/gallery" : "/gallery?create=1")}
              style={{
                padding: "10px 20px",
                border: "1px solid #1A1A1A",
                background: "#1A1A1A",
                color: "#FFFFFF",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {createMode
                ? (lang === "ko" ? "대시보드로" : lang === "ja" ? "ダッシュボードへ" : "Back to dashboard")
                : (lang === "ko" ? "오픈콜 만들기" : lang === "ja" ? "オープンコール作成" : "Create Open Call")}
            </button>
            <button
              onClick={refresh}
              style={{
                padding: "10px 20px",
                border: "1px solid #E5E0DB",
                background: "transparent",
                color: "#4A4A4A",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {t("refresh", lang)}
            </button>
          </div>
        </div>

        {err && (
          <div
            style={{
              marginBottom: 32,
              padding: 20,
              border: "1px solid #D4B0B0",
              background: "#FDF8F8",
              color: "#8B3A3A",
              fontFamily: F,
              fontSize: 12,
            }}
          >
            Error: {err}
          </div>
        )}

        {/* Create Open Call Section */}
        {createMode ? (
        <Section number="01" title={t("gallery_create_oc", lang)}>
          <div style={{ display: "grid", gap: 16 }}>
            {/* Poster Image Upload — prominent */}
            <div>
              <label style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B7355", marginBottom: 10, display: "block" }}>
                {lang === "ko" ? "📷 오픈콜 포스터 이미지" : lang === "ja" ? "📷 ポスター画像" : "📷 Open Call Poster Image"}
              </label>
              {ocPosterPreview ? (
                <div style={{ position: "relative", border: "1px solid #E5E0DB", overflow: "hidden", maxWidth: 400, marginBottom: 12 }}>
                  <img src={ocPosterPreview} alt="Poster" style={{ width: "100%", height: "auto", display: "block", maxHeight: 300, objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", gap: 0, background: "rgba(0,0,0,0.6)" }}>
                    <label style={{ flex: 1, padding: "10px 0", color: "#FFFFFF", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center", cursor: "pointer" }}>
                      {lang === "ko" ? "변경" : "Change"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handlePosterSelect(e, "create")} style={{ display: "none" }} />
                    </label>
                    <button onClick={() => { setOcPosterPreview(null); setOcPosterData(null); }} style={{ flex: 1, padding: "10px 0", border: "none", borderLeft: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#FF9999", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                      {lang === "ko" ? "삭제" : "Remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  width: "100%", maxWidth: 400, height: 160, border: "2px dashed #D4CEC4", background: "#FDFBF7",
                  cursor: "pointer", transition: "all 0.3s",
                }}>
                  <span style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>🖼️</span>
                  <span style={{ fontFamily: F, fontSize: 12, fontWeight: 500, color: "#8B7355", marginBottom: 4 }}>
                    {lang === "ko" ? "포스터 이미지를 업로드하세요" : lang === "ja" ? "ポスター画像をアップロード" : "Upload poster image"}
                  </span>
                  <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>
                    JPG, PNG, WebP · {lang === "ko" ? "최대 5MB" : "Max 5MB"}
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handlePosterSelect(e, "create")} style={{ display: "none" }} />
                </label>
              )}
            </div>

            <input
              value={ocForm.gallery}
              onChange={(e) => setOcForm((p) => ({ ...p, gallery: e.target.value }))}
              placeholder="Gallery name"
              style={inputStyle}
            />
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <select
                value={ocForm.country}
                onChange={(e) => setOcForm((p) => ({ ...p, country: e.target.value }))}
                style={inputStyle}
              >
                <option value="한국">Korea</option>
                <option value="일본">Japan</option>
                <option value="영국">UK</option>
              </select>
              <input
                value={ocForm.city}
                onChange={(e) => setOcForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="City"
                style={inputStyle}
              />
            </div>
            <input
              value={ocForm.theme}
              onChange={(e) => setOcForm((p) => ({ ...p, theme: e.target.value }))}
              placeholder="Theme"
              style={inputStyle}
            />
            <input
              value={ocForm.exhibitionDate}
              onChange={(e) => setOcForm((p) => ({ ...p, exhibitionDate: e.target.value }))}
              placeholder={lang === "ko" ? "전시 날짜 (YYYY-MM-DD)" : "Exhibition date (YYYY-MM-DD)"}
              style={inputStyle}
            />
            <input
              value={ocForm.deadline}
              onChange={(e) => setOcForm((p) => ({ ...p, deadline: e.target.value }))}
              placeholder={lang === "ko" ? "작가 지원 마감일 (YYYY-MM-DD)" : "Artist application deadline (YYYY-MM-DD)"}
              style={inputStyle}
            />
            <button
              onClick={createOpenCall}
              disabled={savingOC}
              style={{
                padding: "14px 24px",
                border: "1px solid #1A1A1A",
                background: "#1A1A1A",
                color: "#FFFFFF",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: savingOC ? "not-allowed" : "pointer",
                opacity: savingOC ? 0.5 : 1,
              }}
            >
                {savingOC ? t("gallery_publishing", lang) : t("gallery_publish", lang)}
            </button>
            {ocMsg && (
              <p style={{ fontFamily: F, fontSize: 11, color: ocMsg.includes("success") ? "#3D5A3D" : "#8B3A3A" }}>
                {ocMsg}
              </p>
            )}
          </div>
        </Section>
        ) : (
          <Section number="01" title={lang === "ko" ? "오픈콜" : lang === "ja" ? "オープンコール" : "Open Calls"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <p style={{ fontFamily: F, fontSize: 12, color: "#8A8A8A" }}>
                {lang === "ko"
                  ? "오픈콜 생성은 버튼을 눌러 작성 페이지로 이동하세요."
                  : lang === "ja"
                    ? "オープンコール作成はボタンから作成画面に移動してください。"
                    : "Use the button to move to the open call creation view."}
              </p>
              <button
                onClick={() => router.push("/gallery?create=1")}
                style={{
                  padding: "10px 18px",
                  border: "1px solid #1A1A1A",
                  background: "#1A1A1A",
                  color: "#FFFFFF",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {lang === "ko" ? "오픈콜 만들기" : lang === "ja" ? "作成する" : "Create"}
              </button>
            </div>
          </Section>
        )}

        {/* My Open Calls Section */}
        <Section number="02" title={t("gallery_my_oc", lang)}>
          {openCalls.length === 0 ? (
            <EmptyState>{t("gallery_no_oc", lang)}</EmptyState>
          ) : (
            <div style={{ display: "grid", gap: 1, background: "#E5E0DB" }}>
              {openCalls.map((o, index) => (
                <div
                  key={o.id}
                  ref={(el) => {
                    openCallItemRefs.current[o.id] = el;
                  }}
                  style={{
                    textAlign: "left",
                    padding: 24,
                    background: focusedOpenCallId === o.id ? "#FFF8EF" : "#FFFFFF",
                    border: focusedOpenCallId === o.id ? "1px solid #E8C79A" : "1px solid transparent",
                    transition: "background 0.3s ease",
                  }}
                >
                  <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                    {/* Poster thumbnail + upload */}
                    <div style={{ flexShrink: 0 }}>
                      {o.posterImage ? (
                        <div style={{ width: 140, height: 100, border: "1px solid #E5E0DB", overflow: "hidden", marginBottom: 8 }}>
                          <img src={o.posterImage} alt="Poster" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{ width: 140, height: 100, border: "2px dashed #D4CEC4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FDFBF7", marginBottom: 8 }}>
                          <span style={{ fontSize: 20, marginBottom: 4, opacity: 0.3 }}>🖼️</span>
                          <span style={{ fontFamily: F, fontSize: 9, color: "#C8C0B4" }}>
                            {lang === "ko" ? "포스터 없음" : "No poster"}
                          </span>
                        </div>
                      )}
                      <label style={{
                        display: "block", textAlign: "center", padding: "7px 12px",
                        border: "1px solid #8B7355", background: o.posterImage ? "transparent" : "#8B7355",
                        color: o.posterImage ? "#8B7355" : "#FFFFFF", fontFamily: F, fontSize: 9,
                        fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
                        cursor: uploadingPosterId === o.id ? "wait" : "pointer",
                        opacity: uploadingPosterId === o.id ? 0.5 : 1,
                        transition: "all 0.3s",
                      }}>
                        {uploadingPosterId === o.id ? "..." : o.posterImage
                          ? (lang === "ko" ? "포스터 변경" : "Change")
                          : (lang === "ko" ? "📷 포스터 등록" : "📷 Upload")}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handlePosterSelect(e, o.id)} style={{ display: "none" }} disabled={uploadingPosterId === o.id} />
                      </label>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => router.push(`/open-calls/${o.id}`)}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontFamily: F, fontSize: 10, color: "#B0B0B0" }}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8A8A" }}>
                          {o.country} / {o.city}
                        </span>
                      </div>
                      <h3 style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: "#1A1A1A" }}>
                        {lang !== "en" && translatedThemeById[o.id] && !showOriginalById[o.id]
                          ? translatedThemeById[o.id]
                          : o.theme}
                      </h3>
                      <p style={{ fontFamily: F, fontSize: 11, color: "#8A8A8A", marginTop: 6 }}>
                        {lang === "ko" ? "전시 날짜" : "Exhibition date"}: {o.exhibitionDate || "-"}
                      </p>
                      <p style={{ fontFamily: F, fontSize: 11, color: "#8A8A8A", marginTop: 4 }}>
                        {lang === "ko" ? "작가 지원 마감일" : "Artist deadline"}: {o.deadline}
                      </p>
                      {targetOpenCallId && targetOpenCallId === o.id && (
                        <p style={{ fontFamily: F, fontSize: 10, color: "#8B7355", marginTop: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {lang === "ko" ? "알림으로 선택된 오픈콜" : lang === "ja" ? "通知から選択されたオープンコール" : "Selected from notification"}
                        </p>
                      )}
                      <p style={{ fontFamily: F, fontSize: 11, color: "#8A8A8A", marginTop: 4 }}>
                        {lang === "ko" ? "지원자" : lang === "ja" ? "応募者" : "Applicants"}: {applicantCountByOpenCall[o.id] || 0}
                        {newApplicantCountByOpenCall[o.id]
                          ? ` · ${lang === "ko" ? "신규" : lang === "ja" ? "新規" : "new"} ${newApplicantCountByOpenCall[o.id]}`
                          : ""}
                      </p>
                      {lang !== "en" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            translateTheme(o);
                          }}
                          disabled={!!translatingById[o.id]}
                          style={{
                            marginTop: 8,
                            padding: "6px 10px",
                            border: "1px solid #E8E3DB",
                            background: "#FFFFFF",
                            color: "#8A8580",
                            fontFamily: F,
                            fontSize: 9,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            cursor: translatingById[o.id] ? "wait" : "pointer",
                          }}
                        >
                          {translatingById[o.id]
                            ? "..."
                            : showOriginalById[o.id]
                              ? t("oc_show_translation", lang)
                              : t("oc_show_original", lang)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Applications Section */}
        <Section number="03" title={lang === "ko" ? "지원자 현황" : lang === "ja" ? "応募者一覧" : "Applications"}>
          {applications.length === 0 ? (
            <EmptyState>{lang === "ko" ? "아직 지원자가 없습니다." : lang === "ja" ? "まだ応募者がいません。" : "No applicants yet."}</EmptyState>
          ) : (
            <div style={{ display: "grid", gap: 1, background: "#E5E0DB" }}>
              {applications
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 20)
                .map((a, idx) => (
                  <div
                    key={a.id}
                    style={{
                      padding: 20,
                      background: targetOpenCallId && a.openCallId === targetOpenCallId ? "#FFF8EF" : "#FFFFFF",
                      border: targetOpenCallId && a.openCallId === targetOpenCallId ? "1px solid #E8C79A" : "1px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontFamily: F, fontSize: 10, color: "#B0B0B0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                          {String(idx + 1).padStart(2, "0")} · {new Date(a.createdAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => router.push(`/artists/${encodeURIComponent(a.artistId)}`)}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            margin: 0,
                            fontFamily: S,
                            fontSize: 18,
                            color: "#1A1A1A",
                            cursor: "pointer",
                            textAlign: "left",
                            textDecoration: "underline",
                            textUnderlineOffset: "3px",
                          }}
                        >
                          {a.artistName || a.artistId}
                        </button>
                        <div style={{ fontFamily: F, fontSize: 10, color: "#8A8A8A", marginTop: 4 }}>
                          ID: {a.artistId}
                        </div>
                        <div style={{ fontFamily: F, fontSize: 11, color: "#8A8A8A", marginTop: 4 }}>
                          {openCallThemeById[a.openCallId] || a.openCallId}
                        </div>
                        {a.artistPortfolioUrl && (
                          <a
                            href={`/api/public/artist/${encodeURIComponent(a.artistId)}?view=portfolio`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-block",
                              marginTop: 8,
                              padding: "6px 10px",
                              border: "1px solid #E8E3DB",
                              color: "#4A4A4A",
                              fontFamily: F,
                              fontSize: 10,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              textDecoration: "none",
                            }}
                          >
                            Portfolio PDF
                          </a>
                        )}
                      </div>
                      <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: a.status === "submitted" ? "#8B3A3A" : "#8A8A8A" }}>
                        {a.status}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Chats Section */}
        <Section number="04" title={t("gallery_messages", lang)}>
          {rooms.length === 0 ? (
            <EmptyState>{t("gallery_no_chats", lang)}</EmptyState>
          ) : (
            <div style={{ display: "grid", gap: 1, background: "#E5E0DB" }}>
              {rooms.map((r) => {
                const last = r.messages?.[r.messages.length - 1];
                return (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/chat/${r.id}?uid=${session?.userId}&role=gallery`)}
                    style={{
                      textAlign: "left",
                      padding: 24,
                      background: "#FFFFFF",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#FAF8F5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#FFFFFF";
                    }}
                  >
                    <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8A8A", marginBottom: 8 }}>
                      Artist: {r.artistId}
                    </div>
                    <p style={{ fontFamily: F, fontSize: 13, color: "#1A1A1A" }}>
                      {last ? (
                        <>
                          <span style={{ color: "#8A8A8A" }}>{last.senderId === session?.userId ? "You" : last.senderId}:</span>{" "}
                          {last.text}
                        </>
                      ) : (
                        <span style={{ color: "#8A8A8A", fontStyle: "italic" }}>No messages yet</span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* Invites Section */}
        <Section number="05" title={t("gallery_invites", lang)}>
          {invites.length === 0 ? (
            <EmptyState>{t("gallery_no_invites", lang)}</EmptyState>
          ) : (
            <div style={{ display: "grid", gap: 1, background: "#E5E0DB" }}>
              {invites.map((i) => (
                <div
                  key={i.id}
                  style={{
                    padding: 24,
                    background: "#FFFFFF",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8A8A", marginBottom: 8 }}>
                        Artist: {i.artistId}
                      </div>
                      <p style={{ fontFamily: F, fontSize: 13, color: "#1A1A1A", marginBottom: 8 }}>
                        {i.message}
                      </p>
                      <p style={{ fontFamily: F, fontSize: 11, color: "#8A8A8A" }}>
                        Status: {i.status} · {new Date(i.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <StatusButton onClick={() => updateInviteStatus(i.id, "viewed")}>Viewed</StatusButton>
                      <StatusButton onClick={() => updateInviteStatus(i.id, "accepted")} primary>Accepted</StatusButton>
                      <StatusButton onClick={() => updateInviteStatus(i.id, "declined")} danger>Declined</StatusButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Templates Section */}
        <Section number="06" title={t("gallery_templates", lang)}>
          {!templates ? (
            <EmptyState>Loading templates...</EmptyState>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              <p style={{ fontFamily: F, fontSize: 11, color: "#8A8A8A", letterSpacing: "0.02em" }}>
                Use placeholders: {"{{gallery}}"}, {"{{theme}}"}, {"{{artist}}"}, {"{{deadline}}"}, {"{{city}}"}, {"{{country}}"}
              </p>
              <textarea
                value={templates.korea}
                onChange={(e) => setTemplates((p) => (p ? { ...p, korea: e.target.value } : p))}
                rows={3}
                placeholder="Korea template"
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <textarea
                value={templates.japan}
                onChange={(e) => setTemplates((p) => (p ? { ...p, japan: e.target.value } : p))}
                rows={3}
                placeholder="Japan template"
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <textarea
                value={templates.global}
                onChange={(e) => setTemplates((p) => (p ? { ...p, global: e.target.value } : p))}
                rows={3}
                placeholder="Global template"
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <button
                onClick={saveTemplates}
                disabled={tplSaving}
                style={{
                  padding: "14px 24px",
                  border: "1px solid #1A1A1A",
                  background: "#1A1A1A",
                  color: "#FFFFFF",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: tplSaving ? "not-allowed" : "pointer",
                  opacity: tplSaving ? 0.5 : 1,
                }}
              >
                {tplSaving ? t("profile_saving", lang) : t("gallery_save_templates", lang)}
              </button>
              {tplMsg && (
                <p style={{ fontFamily: F, fontSize: 11, color: tplMsg.includes("success") ? "#3D5A3D" : "#8B3A3A" }}>
                  {tplMsg}
                </p>
              )}
            </div>
          )}
        </Section>
      </main>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "14px 18px",
  border: "1px solid #E5E0DB",
  background: "#FFFFFF",
  fontFamily: F,
  fontSize: 13,
  color: "#1A1A1A",
  outline: "none",
  transition: "border-color 0.3s ease",
};

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
        <span
          style={{
            fontFamily: F,
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "#B0B0B0",
          }}
        >
          {number}
        </span>
        <h2
          style={{
            fontFamily: S,
            fontSize: 24,
            fontWeight: 400,
            color: "#1A1A1A",
          }}
        >
          {title}
        </h2>
      </div>
      <div
        style={{
          border: "1px solid #E5E0DB",
          padding: 28,
          background: "#FFFFFF",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: S,
        fontSize: 16,
        fontStyle: "italic",
        color: "#8A8A8A",
        textAlign: "center",
        padding: 24,
      }}
    >
      {children}
    </p>
  );
}

function StatusButton({
  onClick,
  children,
  primary,
  danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        border: `1px solid ${danger ? "#8B3A3A" : primary ? "#1A1A1A" : "#E5E0DB"}`,
        background: primary ? "#1A1A1A" : "transparent",
        color: danger ? "#8B3A3A" : primary ? "#FFFFFF" : "#4A4A4A",
        fontFamily: F,
        fontSize: 9,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "all 0.3s ease",
      }}
    >
      {children}
    </button>
  );
}

/** Resize image to max dimensions and return base64 data URI */
function resizeImage(file: File, maxW: number, maxH: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
