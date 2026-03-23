"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

export default function AdminCredentialsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [info, setInfo] = useState<{
    source: string;
    adminEmail: string;
    message: string;
  } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tr = (en: string, ko: string) => (lang === "ko" ? ko : en);

  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const authData = await authRes.json().catch(() => null);
        if (!authData?.authenticated) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        setAuthenticated(true);

        const infoRes = await fetch("/api/admin/change-password", { credentials: "include" });
        const infoData = await infoRes.json().catch(() => null);
        if (infoRes.ok && infoData?.ok) {
          setInfo({
            source: infoData.source,
            adminEmail: infoData.adminEmail,
            message: infoData.message,
          });
        }
      } catch (e) {
        setError(tr("Failed to load", "로딩에 실패했습니다"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router, lang]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword.length < 6) {
      setError(tr("Password must be at least 6 characters", "비밀번호는 6자 이상이어야 합니다"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(tr("New password and confirmation do not match", "새 비밀번호와 확인이 일치하지 않습니다"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error || tr("Failed to change password", "비밀번호 변경에 실패했습니다"));
        return;
      }

      setMessage(tr("Password changed successfully.", "비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setInfo((p) => (p ? { ...p, source: "db", message: "Password is managed in Admin → Credentials." } : null));
    } catch {
      setError(tr("Server error", "서버 오류"));
    } finally {
      setSaving(false);
    }
  }

  if (authenticated === null || loading) {
    return (
      <>
        <AdminTopBar />
        <main style={{ maxWidth: 980, margin: "0 auto", padding: 40 }}>
          <p style={{ fontFamily: F, fontSize: 13, color: "#8A8580" }}>{tr("Loading...", "로딩 중...")}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: 40 }}>
        <div style={{ marginBottom: 22 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8B7355",
            }}
          >
            {tr("Admin", "관리자")}
          </span>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
            {tr("Admin Credentials", "관리자 계정")}
          </h1>
        </div>

        <div
          style={{
            border: "1px solid #E8E3DB",
            background: "#FFFFFF",
            padding: "22px 24px",
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", marginTop: 0, marginBottom: 12 }}>
            {tr("Current status", "현재 상태")}
          </h2>
          {info && (
            <>
              <p style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", margin: "0 0 8px" }}>
                <strong>{tr("Email:", "이메일:")}</strong> {info.adminEmail}
              </p>
              <p style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", margin: "0 0 8px" }}>
                <strong>{tr("Password source:", "비밀번호 출처:")}</strong>{" "}
                {info.source === "db"
                  ? tr("Stored in database (manage below)", "DB에 저장됨 (아래에서 변경)")
                  : tr("From ADMIN_PASSWORD env var", "ADMIN_PASSWORD 환경변수")}
              </p>
              <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", margin: 0 }}>
                {info.message}
              </p>
            </>
          )}
        </div>

        <div
          style={{
            border: "1px solid #E8E3DB",
            background: "#FFFFFF",
            padding: "22px 24px",
          }}
        >
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 20 }}>
            {tr(
              "Set a new password. After changing, the password will be stored in the database and you can manage it here.",
              "새 비밀번호를 설정하세요. 변경 후 비밀번호는 DB에 저장되며 여기서 관리할 수 있습니다.",
            )}
          </p>

          <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: F,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#8A8580",
                  marginBottom: 6,
                }}
              >
                {tr("Verify password", "비밀번호 확인")}
              </label>
              <input
                type="password"
                id="verify-pw"
                placeholder={tr("Enter password to verify", "비밀번호 입력")}
                style={{
                  width: 220,
                  padding: "12px 14px",
                  border: "1px solid #E8E3DB",
                  background: "#FDFBF7",
                  fontFamily: F,
                  fontSize: 13,
                  marginRight: 8,
                }}
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                const input = document.getElementById("verify-pw") as HTMLInputElement;
                const pw = input?.value?.trim() || "";
                if (!pw) {
                  setError(tr("Enter password", "비밀번호를 입력하세요"));
                  return;
                }
                setError(null);
                setMessage(null);
                setSaving(true);
                try {
                  const res = await fetch("/api/admin/change-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ currentPassword: pw, verifyOnly: true }),
                  });
                  const data = await res.json().catch(() => null);
                  if (res.ok && data?.ok && data?.verified) {
                    setMessage(tr("Password is correct.", "비밀번호가 맞습니다."));
                  } else {
                    setError(data?.error || tr("Password is incorrect", "비밀번호가 틀립니다"));
                  }
                } catch {
                  setError(tr("Server error", "서버 오류"));
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              style={{
                padding: "12px 20px",
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                color: "#4A4A4A",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "..." : tr("Verify", "확인")}
            </button>
          </div>

          <h3 style={{ fontFamily: S, fontSize: 16, fontWeight: 400, color: "#1A1A1A", marginTop: 24, marginBottom: 12 }}>
            {tr("Change password", "비밀번호 변경")}
          </h3>
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontFamily: F,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#8A8580",
                  marginBottom: 6,
                }}
              >
                {tr("Current password", "현재 비밀번호")}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  maxWidth: 320,
                  padding: "12px 14px",
                  border: "1px solid #E8E3DB",
                  background: "#FDFBF7",
                  fontFamily: F,
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontFamily: F,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#8A8580",
                  marginBottom: 6,
                }}
              >
                {tr("New password", "새 비밀번호")}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder={tr("At least 6 characters", "6자 이상")}
                style={{
                  width: "100%",
                  maxWidth: 320,
                  padding: "12px 14px",
                  border: "1px solid #E8E3DB",
                  background: "#FDFBF7",
                  fontFamily: F,
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
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
                  marginBottom: 6,
                }}
              >
                {tr("Confirm new password", "새 비밀번호 확인")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: "100%",
                  maxWidth: 320,
                  padding: "12px 14px",
                  border: "1px solid #E8E3DB",
                  background: "#FDFBF7",
                  fontFamily: F,
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 24px",
                border: "1px solid #1A1A1A",
                background: "#1A1A1A",
                color: "#FFFFFF",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? tr("Saving...", "저장 중...") : tr("Change password", "비밀번호 변경")}
            </button>
          </form>

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                background: "rgba(139,74,74,0.06)",
                border: "1px solid rgba(139,74,74,0.2)",
                color: "#8B4A4A",
                fontFamily: F,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
          {message && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                background: "rgba(90,122,90,0.08)",
                border: "1px solid rgba(90,122,90,0.3)",
                color: "#5A7A5A",
                fontFamily: F,
                fontSize: 12,
              }}
            >
              {message}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 24,
            padding: "16px 20px",
            background: "#FAF8F4",
            border: "1px solid #E8E3DB",
          }}
        >
          <h3 style={{ fontFamily: S, fontSize: 14, fontWeight: 500, color: "#1A1A1A", margin: "0 0 8px" }}>
            {tr("Locked out?", "비밀번호를 잊으셨나요?")}
          </h3>
          <p style={{ fontFamily: F, fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
            {tr(
              "Set ADMIN_RESET_TOKEN in your environment, then POST to /api/admin/reset-password with { token: \"your-token\", newPassword: \"new-password\" }. Remove the token after use.",
              "환경변수에 ADMIN_RESET_TOKEN을 설정한 뒤, /api/admin/reset-password에 { token, newPassword }를 POST하세요. 사용 후 토큰을 제거하세요.",
            )}
          </p>
        </div>
      </main>
    </>
  );
}
