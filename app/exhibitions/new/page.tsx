"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type Me = { session: { userId: string; role: string } | null; profile: any | null };

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid #E8E3DB",
  background: "#FDFBF7", color: "#1A1A1A", fontFamily: F, fontSize: 13,
  outline: "none", boxSizing: "border-box",
};

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

export default function NewExhibitionPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", startDate: "", endDate: "", city: "", country: "",
    description: "", isPublic: true,
    spaceName: "", spaceType: "", spaceWebsite: "",
    curatorName: "", curatorOrganization: "",
  });

  // invite state
  const [createdExId, setCreatedExId] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me?lite=1", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setMe(d);
        if (!d?.session || d.session.role !== "artist") router.replace("/login?role=artist");
      });
  }, [router]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.title.trim()) { setMsg(lang === "ko" ? "전시명을 입력하세요" : "Title is required"); return; }
    setSaving(true); setMsg(null);
    const res = await fetch("/api/artist/self-exhibitions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (data?.ok) {
      setCreatedExId(data.exhibition?.id ?? null);
      setMsg(lang === "ko" ? "전시가 등록되었습니다!" : "Exhibition recorded!");
    } else {
      setMsg(data?.error ?? (lang === "ko" ? "저장 실패" : "Failed to save"));
    }
  }

  async function invite() {
    if (!inviteId.trim() || !createdExId) return;
    setInviting(true); setInviteMsg(null);
    const res = await fetch(`/api/artist/self-exhibitions/${createdExId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ inviteArtistId: inviteId.trim() }),
    });
    const data = await res.json().catch(() => null);
    setInviting(false);
    if (data?.ok) { setInviteId(""); setInviteMsg(lang === "ko" ? "초대 완료" : "Invited!"); }
    else {
      setInviteMsg(
        data?.error === "artist_not_found" ? (lang === "ko" ? "작가를 찾을 수 없습니다" : "Artist not found") :
        data?.error === "already_invited" ? (lang === "ko" ? "이미 초대됨" : "Already invited") :
        (lang === "ko" ? "초대 실패" : "Invite failed")
      );
    }
  }

  if (!me) return <><TopBar /><div style={{ padding: 60, textAlign: "center", fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>Loading…</div></>;

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "#8B7355", marginBottom: 12 }}>
            {lang === "ko" ? "전시 기록" : "Record Exhibition"}
          </div>
          <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 300, color: "#1A1A1A", margin: 0, letterSpacing: "0.02em" }}>
            {lang === "ko" ? "새 전시 등록" : "Add Exhibition"}
          </h1>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 12, lineHeight: 1.7 }}>
            {lang === "ko"
              ? "전시 하나가 당신의 예술 그래프를 만듭니다. 공간, 큐레이터, 함께한 작가들이 연결됩니다."
              : "Each exhibition builds your art graph — connecting spaces, curators, and fellow artists."}
          </p>
        </div>

        {!createdExId ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Basic info */}
            <div style={{ border: "1px solid #E8E3DB", padding: 24, marginBottom: 1 }}>
              <div style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B7355", marginBottom: 20 }}>
                {lang === "ko" ? "기본 정보" : "Basic Info"}
              </div>
              <Lbl label={lang === "ko" ? "전시명 *" : "Exhibition Title *"}>
                <input value={form.title} onChange={e => set("title", e.target.value)} placeholder={lang === "ko" ? "전시 제목" : "Exhibition title"} style={inp} />
              </Lbl>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Lbl label={lang === "ko" ? "시작일" : "Start Date"}>
                  <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} style={inp} />
                </Lbl>
                <Lbl label={lang === "ko" ? "종료일" : "End Date"}>
                  <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} style={inp} />
                </Lbl>
                <Lbl label={lang === "ko" ? "도시" : "City"}>
                  <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Seoul" style={inp} />
                </Lbl>
                <Lbl label={lang === "ko" ? "국가" : "Country"}>
                  <input value={form.country} onChange={e => set("country", e.target.value)} placeholder="KR" style={inp} />
                </Lbl>
              </div>
              <Lbl label={lang === "ko" ? "전시 설명" : "Description"}>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder={lang === "ko" ? "전시 소개 (선택)" : "Exhibition description (optional)"} style={{ ...inp, resize: "vertical" }} />
              </Lbl>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="pub" checked={form.isPublic} onChange={e => set("isPublic", e.target.checked)} style={{ cursor: "pointer" }} />
                <label htmlFor="pub" style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A", cursor: "pointer" }}>
                  {lang === "ko" ? "공개 전시로 등록" : "Make this exhibition public"}
                </label>
              </div>
            </div>

            {/* Space */}
            <div style={{ border: "1px solid #E8E3DB", padding: 24, marginBottom: 1 }}>
              <div style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B7355", marginBottom: 20 }}>
                {lang === "ko" ? "전시 공간 (선택)" : "Space (optional)"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Lbl label={lang === "ko" ? "공간명" : "Space Name"}>
                  <input value={form.spaceName} onChange={e => set("spaceName", e.target.value)} placeholder={lang === "ko" ? "갤러리 / 공간명" : "Gallery / space name"} style={inp} />
                </Lbl>
                <Lbl label={lang === "ko" ? "유형" : "Type"}>
                  <select value={form.spaceType} onChange={e => set("spaceType", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                    <option value="">—</option>
                    <option value="gallery">Gallery</option>
                    <option value="museum">Museum</option>
                    <option value="independent">Independent Space</option>
                    <option value="project_space">Project Space</option>
                    <option value="art_fair">Art Fair</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>
                </Lbl>
              </div>
              <Lbl label={lang === "ko" ? "공간 웹사이트" : "Space Website"}>
                <input value={form.spaceWebsite} onChange={e => set("spaceWebsite", e.target.value)} placeholder="https://" style={inp} />
              </Lbl>
            </div>

            {/* Curator */}
            <div style={{ border: "1px solid #E8E3DB", padding: 24, marginBottom: 24 }}>
              <div style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B7355", marginBottom: 20 }}>
                {lang === "ko" ? "큐레이터 (선택)" : "Curator (optional)"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Lbl label={lang === "ko" ? "큐레이터 이름" : "Curator Name"}>
                  <input value={form.curatorName} onChange={e => set("curatorName", e.target.value)} placeholder={lang === "ko" ? "큐레이터 이름" : "Curator name"} style={inp} />
                </Lbl>
                <Lbl label={lang === "ko" ? "소속" : "Organization"}>
                  <input value={form.curatorOrganization} onChange={e => set("curatorOrganization", e.target.value)} placeholder={lang === "ko" ? "기관 / 갤러리" : "Institution / gallery"} style={inp} />
                </Lbl>
              </div>
            </div>

            {msg && (
              <div style={{ fontFamily: F, fontSize: 12, color: msg.includes("실패") || msg.includes("Failed") ? "#8B4A4A" : "#4A7A4A", marginBottom: 16 }}>
                {msg}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={submit} disabled={saving} style={{ padding: "14px 40px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "…" : (lang === "ko" ? "전시 등록" : "Record Exhibition")}
              </button>
              <button onClick={() => router.back()} style={{ padding: "14px 24px", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid #E8E3DB", cursor: "pointer" }}>
                {lang === "ko" ? "취소" : "Cancel"}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Invite artists */
          <div>
            <div style={{ border: "1px solid #4A7A4A", background: "#F4FAF4", padding: 20, marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <div>
                <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: "#4A7A4A" }}>{msg}</div>
                <div style={{ fontFamily: F, fontSize: 11, color: "#6A9A6A", marginTop: 2 }}>
                  {lang === "ko" ? "함께한 작가들을 초대하세요." : "Now invite artists who participated."}
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid #E8E3DB", padding: 24, marginBottom: 24 }}>
              <div style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B7355", marginBottom: 16 }}>
                {lang === "ko" ? "참여 작가 초대" : "Invite Participating Artists"}
              </div>
              <p style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginBottom: 16, lineHeight: 1.6 }}>
                {lang === "ko"
                  ? "작가 ID를 입력해 초대하세요. 초대받은 작가가 수락하면 그들의 타임라인에도 이 전시가 등록됩니다."
                  : "Enter an artist ID to invite them. When they accept, this exhibition appears on their timeline too."}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={inviteId}
                  onChange={e => setInviteId(e.target.value)}
                  placeholder={lang === "ko" ? "작가 ID (예: artist_abc123)" : "Artist ID (e.g. artist_abc123)"}
                  style={{ ...inp, flex: 1 }}
                  onKeyDown={e => { if (e.key === "Enter") invite(); }}
                />
                <button onClick={invite} disabled={inviting || !inviteId.trim()} style={{ padding: "10px 20px", background: "#8B7355", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: inviting ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: inviting ? 0.6 : 1 }}>
                  {inviting ? "…" : (lang === "ko" ? "초대" : "Invite")}
                </button>
              </div>
              {inviteMsg && (
                <div style={{ fontFamily: F, fontSize: 11, marginTop: 10, color: inviteMsg.includes("완료") || inviteMsg.includes("Invited") ? "#4A7A4A" : "#8B4A4A" }}>
                  {inviteMsg}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => router.push(`/exhibitions/${createdExId}`)} style={{ padding: "14px 32px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>
                {lang === "ko" ? "전시 페이지 보기" : "View Exhibition"}
              </button>
              <button onClick={() => { setCreatedExId(null); setForm({ title: "", startDate: "", endDate: "", city: "", country: "", description: "", isPublic: true, spaceName: "", spaceType: "", spaceWebsite: "", curatorName: "", curatorOrganization: "" }); setMsg(null); }} style={{ padding: "14px 24px", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid #E8E3DB", cursor: "pointer" }}>
                {lang === "ko" ? "다른 전시 등록" : "Add Another"}
              </button>
              <button onClick={() => router.push("/artist/me")} style={{ padding: "14px 24px", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid #E8E3DB", cursor: "pointer" }}>
                {lang === "ko" ? "내 프로필로" : "My Profile"}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
