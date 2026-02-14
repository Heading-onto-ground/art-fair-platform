"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

export default function AdminLoginPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || tr("Login failed", "로그인 실패", "ログイン失敗", "Échec de connexion"));
        return;
      }

      router.push("/admin/outreach");
    } catch {
      setError(tr("Server error", "서버 오류", "サーバーエラー", "Erreur serveur"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FDFBF7",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontFamily: F,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#8B7355",
              marginBottom: 16,
            }}
          >
            {tr("ROB Administration", "ROB 관리자", "ROB 管理", "Administration ROB")}
          </div>
          <h1
            style={{
              fontFamily: S,
              fontSize: 36,
              fontWeight: 300,
              color: "#1A1A1A",
              margin: 0,
            }}
          >
            {tr("Admin Login", "관리자 로그인", "管理者ログイン", "Connexion Admin")}
          </h1>
          <p
            style={{
              fontFamily: F,
              fontSize: 12,
              fontWeight: 300,
              color: "#8A8580",
              marginTop: 12,
            }}
          >
            {tr("Authorized personnel only", "권한 있는 사용자만 접근 가능", "許可された担当者のみ", "Personnel autorisé uniquement")}
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleLogin}
          style={{
            border: "1px solid #E8E3DB",
            background: "#FFFFFF",
            padding: 40,
          }}
        >
          {error && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: 24,
                background: "rgba(139,74,74,0.04)",
                border: "1px solid rgba(139,74,74,0.15)",
                fontFamily: F,
                fontSize: 12,
                color: "#8B4A4A",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontFamily: F,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#8A8580",
                marginBottom: 8,
              }}
            >
              {tr("Email", "이메일", "メール", "Email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@rob.art"
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid #E8E3DB",
                background: "#FDFBF7",
                color: "#1A1A1A",
                fontFamily: F,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label
              style={{
                display: "block",
                fontFamily: F,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#8A8580",
                marginBottom: 8,
              }}
            >
              {tr("Password", "비밀번호", "パスワード", "Mot de passe")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={tr("Enter admin password", "관리자 비밀번호를 입력하세요", "管理者パスワードを入力", "Entrez le mot de passe admin")}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid #E8E3DB",
                background: "#FDFBF7",
                color: "#1A1A1A",
                fontFamily: F,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              border: "none",
              background: loading ? "#E8E3DB" : "#1A1A1A",
              color: loading ? "#8A8580" : "#FDFBF7",
              fontFamily: F,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? tr("Authenticating...", "인증 중...", "認証中...", "Authentification...")
              : tr("Sign In", "로그인", "ログイン", "Se connecter")}
          </button>
        </form>

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent",
              border: "none",
              fontFamily: F,
              fontSize: 11,
              color: "#B0AAA2",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            &larr; {tr("Back to main site", "메인 사이트로 돌아가기", "メインサイトへ戻る", "Retour au site principal")}
          </button>
        </div>
      </div>
    </main>
  );
}
