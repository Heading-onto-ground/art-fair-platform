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
  const [info, setInfo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "artist" || roleParam === "gallery") setRole(roleParam);
    const verified = searchParams.get("verified");
    if (verified === "success") {
      setInfo(tr("Email verified. You can now sign in.", "이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.", "メール認証が完了しました。ログインできます。", "Email verifie. Vous pouvez maintenant vous connecter."));
      setMode("login");
    } else if (verified === "expired") {
      setErr(tr("Verification link expired. Please resend verification email.", "인증 링크가 만료되었습니다. 인증 메일을 다시 보내주세요.", "認証リンクの有効期限が切れました。認証メールを再送してください。", "Le lien de verification a expire. Veuillez renvoyer l'email de verification."));
      setMode("login");
    } else if (verified === "invalid") {
      setErr(tr("Invalid verification link.", "유효하지 않은 인증 링크입니다.", "無効な認証リンクです。", "Lien de verification invalide."));
      setMode("login");
    }
  }, [searchParams, lang]);

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
    setInfo(null);
    setNeedsVerification(false);
    const e = email.trim(), p = password.trim();
    if (!e) return setErr(t("login_email_required", lang));
    if (!p) return setErr(t("login_password_required", lang));
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, email: e, password: p }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (data?.error === "email not verified") {
          setNeedsVerification(true);
          if (data?.verificationReason === "expired") {
            setErr(
              tr(
                "Verification link expired. We sent a new verification email automatically.",
                "인증 링크가 만료되었습니다. 새 인증 메일을 자동으로 다시 보냈습니다.",
                "認証リンクの有効期限が切れました。新しい認証メールを自動再送しました。",
                "Le lien de verification a expire. Un nouvel email de verification a ete renvoye automatiquement."
              )
            );
          } else {
            setErr(
              tr(
                "Email is not verified. Please verify your email first.",
                "이메일 인증이 완료되지 않았습니다. 먼저 이메일 인증을 해주세요.",
                "メール認証が完了していません。先に認証してください。",
                "Votre email n'est pas verifie. Veuillez d'abord verifier votre email."
              )
            );
          }
          if (data?.autoResent) {
            setInfo(
              tr(
                "A new verification email was sent. Please open the latest email.",
                "인증 메일을 새로 보냈습니다. 가장 최근 메일을 열어주세요.",
                "認証メールを再送しました。最新メールを開いてください。",
                "Un nouvel email de verification a ete envoye. Veuillez ouvrir le plus recent."
              )
            );
          } else if (data?.resendError) {
            setInfo(
              tr(
                "Could not auto-resend verification email. Please click 'Resend Verification Email'.",
                "자동 재발송에 실패했습니다. 아래 '인증 메일 다시 보내기'를 눌러주세요.",
                "自動再送に失敗しました。下の「認証メールを再送」を押してください。",
                "Le renvoi automatique a echoue. Veuillez cliquer sur 'Renvoyer l'email de verification'."
              )
            );
          }
        } else {
          setErr(data?.error ?? `Login failed (${res.status})`);
        }
        return;
      }
      await gotoByServerSession();
    } catch { setErr(t("login_server_error", lang)); }
    finally { setLoading(false); }
  };

  const onSignup = async () => {
    setErr(null);
    setInfo(null);
    setNeedsVerification(false);
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
      if (data?.requiresEmailVerification) {
        setInfo(
          tr(
            "Signup complete. Please check your email and verify your account before login.",
            "가입이 완료되었습니다. 로그인 전에 이메일 인증을 완료해주세요.",
            "登録が完了しました。ログイン前にメール認証を完了してください。",
            "Inscription terminee. Veuillez verifier votre email avant de vous connecter."
          )
        );
        setMode("login");
        setPassword("");
        return;
      }
      await gotoByServerSession();
    } catch { setErr(t("login_server_error", lang)); }
    finally { setLoading(false); }
  };

  const onResendVerification = async () => {
    const e = email.trim();
    if (!e) {
      setErr(tr("Enter your email first.", "먼저 이메일을 입력해주세요.", "先にメールを入力してください。", "Veuillez d'abord saisir votre email."));
      return;
    }
    setResending(true);
    setErr(null);
    setInfo(null);
    setNeedsVerification(false);
    try {
      const res = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, role, lang }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error ?? "Failed to resend verification email");
        return;
      }
      setInfo(
        tr(
          "Verification email sent. Please check your inbox.",
          "인증 메일을 다시 보냈습니다. 받은편지함을 확인해주세요.",
          "認証メールを再送しました。受信トレイを確認してください。",
          "Email de verification renvoye. Veuillez verifier votre boite de reception."
        )
      );
    } catch {
      setErr(t("login_server_error", lang));
    } finally {
      setResending(false);
    }
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

          {info && (
            <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(90,122,90,0.08)", border: "1px solid rgba(90,122,90,0.24)", color: "#3D5A3D", fontFamily: F, fontSize: 12, fontWeight: 400 }}>
              {info}
            </div>
          )}
          {err && (
            <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(139,74,74,0.06)", border: "1px solid rgba(139,74,74,0.2)", color: "#8B4A4A", fontFamily: F, fontSize: 12, fontWeight: 400 }}>
              {err}
            </div>
          )}
          {mode === "login" && needsVerification && (
            <button
              onClick={onResendVerification}
              disabled={resending}
              style={{
                marginTop: 10,
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                color: "#8A8580",
                padding: "10px 12px",
                width: "100%",
                fontFamily: F,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: resending ? "wait" : "pointer",
              }}
            >
              {resending
                ? "..."
                : tr("Resend Verification Email", "인증 메일 다시 보내기", "認証メールを再送", "Renvoyer l'email de verification")}
            </button>
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
