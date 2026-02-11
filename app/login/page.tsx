"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";

type Role = "artist" | "gallery";
type MeResponse = { session: { userId: string; role: Role; email?: string } | null; profile: any | null };

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const [role, setRole] = useState<Role>("artist");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [artistId, setArtistId] = useState("");
  const [galleryId, setGalleryId] = useState("");
  const [name, setName] = useState("");
  const [startedYear, setStartedYear] = useState("");
  const [genre, setGenre] = useState("");
  const [instagram, setInstagram] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [address, setAddress] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "artist" || roleParam === "gallery") setRole(roleParam);
  }, [searchParams]);

  const gotoByServerSession = async () => {
    const meRes = await fetch("/api/auth/me", { cache: "no-store" });
    const me = (await meRes.json().catch(() => null)) as MeResponse | null;
    const realRole = me?.session?.role;
    if (realRole === "artist") router.push("/artist");
    else if (realRole === "gallery") router.push("/gallery");
    else router.push("/login");
  };

  const onLogin = async () => {
    setErr(null);
    const e = email.trim(), p = password.trim();
    if (!e) return setErr(t("login_email_required", lang));
    if (!p) return setErr(t("login_password_required", lang));
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, email: e, password: p }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { setErr(data?.error ?? `Login failed (${res.status})`); return; }
      await gotoByServerSession();
    } catch { setErr(t("login_server_error", lang)); }
    finally { setLoading(false); }
  };

  const onSignup = async () => {
    setErr(null);
    const e = email.trim(), p = password.trim();
    if (!e) return setErr(t("login_email_required", lang));
    if (!p || p.length < 6) return setErr(t("login_password_min", lang));
    if (role === "artist" && (!artistId || !name || !startedYear || !genre)) return setErr(t("login_fill_required", lang));
    if (role === "gallery" && (!galleryId || !name || !address || !foundedYear || !instagram)) return setErr(t("login_fill_required", lang));
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, email: e, password: p, artistId: role === "artist" ? artistId : undefined, galleryId: role === "gallery" ? galleryId : undefined, name, startedYear: role === "artist" ? Number(startedYear) : undefined, genre: role === "artist" ? genre : undefined, instagram, portfolioUrl: role === "artist" ? portfolioUrl : undefined, address: role === "gallery" ? address : undefined, foundedYear: role === "gallery" ? Number(foundedYear) : undefined }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { setErr(data?.error ?? `Signup failed (${res.status})`); return; }
      await gotoByServerSession();
    } catch { setErr(t("login_server_error", lang)); }
    finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid #E8E3DB", color: "#1A1A1A", fontFamily: F, fontSize: 13, fontWeight: 400, outline: "none" };

  return (
    <>
      <TopBar />
      <style jsx global>{`
        @media (max-width: 480px) {
          .signup-fields > div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <main style={{ maxWidth: 460, margin: "0 auto", padding: "60px 20px", minHeight: "calc(100vh - 60px)" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 6vw, 42px)", fontWeight: 300, color: "#1A1A1A", marginBottom: 12 }}>
            {mode === "login" ? t("login_welcome", lang) : t("login_create", lang)}
          </h1>
          <p style={{ fontFamily: F, fontSize: 13, fontWeight: 300, color: "#8A8580" }}>
            {mode === "login" ? t("login_signin_subtitle", lang) : t("login_signup_subtitle", lang)}
          </p>
        </div>

        <div className="login-card" style={{ background: "#FFFFFF", border: "1px solid #E8E3DB", padding: "clamp(20px, 4vw, 40px)" }}>
          {/* Role toggle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, marginBottom: 32 }}>
            {(["artist", "gallery"] as const).map((r) => (
              <button key={r} onClick={() => { setRole(r); setErr(null); }} style={{ padding: "14px", border: "1px solid #E8E3DB", background: role === r ? "#1A1A1A" : "transparent", color: role === r ? "#FDFBF7" : "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.3s" }}>
                {t(r, lang)}
              </button>
            ))}
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 24, marginBottom: 32, justifyContent: "center" }}>
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "4px 0", border: "none", borderBottom: mode === m ? "1px solid #1A1A1A" : "1px solid transparent", background: "transparent", color: mode === m ? "#1A1A1A" : "#B0AAA2", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                {m === "login" ? t("login_signin", lang) : t("login_signup", lang)}
              </button>
            ))}
          </div>

          <div className="signup-fields" style={{ display: "grid", gap: 18 }}>
            <Lbl label={t("email", lang)}><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login_email_placeholder", lang)} autoComplete="email" style={inp} /></Lbl>
            <Lbl label={t("password", lang)}><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("login_password_placeholder", lang)} type="password" autoComplete="current-password" style={inp} onKeyDown={(e) => { if (e.key === "Enter" && mode === "login") onLogin(); }} /></Lbl>

            {mode === "signup" && (
              <>
                <div style={{ height: 1, background: "#E8E3DB", margin: "4px 0" }} />
                {role === "artist" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <Lbl label={`${t("login_artist_id", lang)} *`}><input value={artistId} onChange={(e) => setArtistId(e.target.value)} placeholder="art-0001" style={inp} /></Lbl>
                      <Lbl label={`${t("name", lang)} *`}><input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "ko" ? "이름" : lang === "ja" ? "氏名" : "Full name"} style={inp} /></Lbl>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <Lbl label={`${t("login_start_year", lang)} *`}><input value={startedYear} onChange={(e) => setStartedYear(e.target.value)} placeholder="2018" style={inp} /></Lbl>
                      <Lbl label={`${t("login_genre", lang)} *`}><input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder={lang === "ko" ? "회화" : lang === "ja" ? "絵画" : "Painting"} style={inp} /></Lbl>
                    </div>
                    <Lbl label="Instagram"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" style={inp} /></Lbl>
                  </>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <Lbl label={`${t("login_gallery_id", lang)} *`}><input value={galleryId} onChange={(e) => setGalleryId(e.target.value)} placeholder="gal-0001" style={inp} /></Lbl>
                      <Lbl label={`${t("name", lang)} *`}><input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "ko" ? "갤러리 이름" : lang === "ja" ? "ギャラリー名" : "Gallery name"} style={inp} /></Lbl>
                    </div>
                    <Lbl label={`${t("login_address", lang)} *`}><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={lang === "ko" ? "도시, 국가" : "City, Country"} style={inp} /></Lbl>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <Lbl label={`${t("login_founded_year", lang)} *`}><input value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} placeholder="2010" style={inp} /></Lbl>
                      <Lbl label="Instagram *"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@gallery" style={inp} /></Lbl>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {err && (
            <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(139,74,74,0.06)", border: "1px solid rgba(139,74,74,0.2)", color: "#8B4A4A", fontFamily: F, fontSize: 12, fontWeight: 400 }}>
              {err}
            </div>
          )}

          <button onClick={mode === "login" ? onLogin : onSignup} disabled={loading} style={{ marginTop: 28, width: "100%", padding: "16px", border: "none", background: loading ? "#E8E3DB" : "#1A1A1A", color: loading ? "#8A8580" : "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.3s" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#8B7355"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#1A1A1A"; }}>
            {loading ? "..." : mode === "login" ? t("login_signin", lang) : t("login_create", lang)}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 28, fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>
          {mode === "login" ? (
            <>{t("login_new_here", lang)} <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "#8B7355", fontFamily: F, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: 0, textDecoration: "underline", textTransform: "none", letterSpacing: "normal" }}>{t("login_signup", lang)}</button></>
          ) : (
            <>{t("login_have_account", lang)} <button onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "#8B7355", fontFamily: F, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: 0, textDecoration: "underline", textTransform: "none", letterSpacing: "normal" }}>{t("login_signin", lang)}</button></>
          )}
        </p>
      </main>
    </>
  );
}

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8580", marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}
