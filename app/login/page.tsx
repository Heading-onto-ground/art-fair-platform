"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/translate";

type Role = "artist" | "gallery";

type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

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
    if (roleParam === "artist" || roleParam === "gallery") {
      setRole(roleParam);
    }
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
    const e = email.trim();
    const p = password.trim();
    if (!e) return setErr("이메일을 입력해주세요.");
    if (!p) return setErr("비밀번호를 입력해주세요.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, email: e, password: p }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error ?? `로그인 실패 (${res.status})`);
        return;
      }
      await gotoByServerSession();
    } catch {
      setErr("서버 오류");
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async () => {
    setErr(null);
    const e = email.trim();
    const p = password.trim();
    if (!e) return setErr("이메일을 입력해주세요.");
    if (!p || p.length < 6) return setErr("비밀번호는 6자 이상이어야 해요.");
    if (role === "artist" && (!artistId || !name || !startedYear || !genre)) {
      return setErr("작가 필수 정보를 모두 입력해주세요.");
    }
    if (role === "gallery" && (!galleryId || !name || !address || !foundedYear || !instagram)) {
      return setErr("갤러리 필수 정보를 모두 입력해주세요.");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          email: e,
          password: p,
          artistId: role === "artist" ? artistId : undefined,
          galleryId: role === "gallery" ? galleryId : undefined,
          name,
          startedYear: role === "artist" ? Number(startedYear) : undefined,
          genre: role === "artist" ? genre : undefined,
          instagram,
          portfolioUrl: role === "artist" ? portfolioUrl : undefined,
          address: role === "gallery" ? address : undefined,
          foundedYear: role === "gallery" ? Number(foundedYear) : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error ?? `회원가입 실패 (${res.status})`);
        return;
      }
      await gotoByServerSession();
    } catch {
      setErr("서버 오류");
    } finally {
      setLoading(false);
    }
  };

  const accentColor = role === "artist" ? "#6366f1" : "#ec4899";

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 440, margin: "40px auto", padding: "0 20px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>
            {mode === "login" ? t("login_title", lang) : t("signup_title", lang)}
          </h1>
          <p style={{ color: "#888", fontSize: 14, marginTop: 6 }}>
            {mode === "login" ? "Welcome back!" : "Create your account"}
          </p>
        </div>

        {/* Form Card */}
        <div
          style={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          {/* Role Toggle */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              background: "#f5f5f5",
              padding: 4,
              borderRadius: 10,
            }}
          >
            <ToggleBtn
              active={role === "artist"}
              onClick={() => { setRole("artist"); setErr(null); }}
              color="#6366f1"
            >
              🎨 Artist
            </ToggleBtn>
            <ToggleBtn
              active={role === "gallery"}
              onClick={() => { setRole("gallery"); setErr(null); }}
              color="#ec4899"
            >
              🏛️ Gallery
            </ToggleBtn>
          </div>

          {/* Mode Toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <ModeBtn active={mode === "login"} onClick={() => setMode("login")}>
              {t("login_title", lang)}
            </ModeBtn>
            <ModeBtn active={mode === "signup"} onClick={() => setMode("signup")}>
              {t("signup_title", lang)}
            </ModeBtn>
          </div>

          {/* Form */}
          <div style={{ display: "grid", gap: 14 }}>
            <Field label="Email">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={{ width: "100%" }}
              />
            </Field>
            <Field label="Password">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                type="password"
                autoComplete="current-password"
                style={{ width: "100%" }}
                onKeyDown={(e) => { if (e.key === "Enter" && mode === "login") onLogin(); }}
              />
            </Field>

            {mode === "signup" && (
              <>
                {role === "artist" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Artist ID *">
                        <input value={artistId} onChange={(e) => setArtistId(e.target.value)} placeholder="ART-0001" style={{ width: "100%" }} />
                      </Field>
                      <Field label="Name *">
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Min Kim" style={{ width: "100%" }} />
                      </Field>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Start Year *">
                        <input value={startedYear} onChange={(e) => setStartedYear(e.target.value)} placeholder="2018" style={{ width: "100%" }} />
                      </Field>
                      <Field label="Genre *">
                        <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Painting" style={{ width: "100%" }} />
                      </Field>
                    </div>
                    <Field label="Instagram (optional)">
                      <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." style={{ width: "100%" }} />
                    </Field>
                  </>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Gallery ID *">
                        <input value={galleryId} onChange={(e) => setGalleryId(e.target.value)} placeholder="GAL-0001" style={{ width: "100%" }} />
                      </Field>
                      <Field label="Name *">
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aurora Gallery" style={{ width: "100%" }} />
                      </Field>
                    </div>
                    <Field label="Address *">
                      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Seoul, South Korea" style={{ width: "100%" }} />
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Founded Year *">
                        <input value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} placeholder="2010" style={{ width: "100%" }} />
                      </Field>
                      <Field label="Instagram *">
                        <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@gallery" style={{ width: "100%" }} />
                      </Field>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Error */}
          {err && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={mode === "login" ? onLogin : onSignup}
            disabled={loading}
            style={{
              marginTop: 20,
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              border: "none",
              background: loading ? "#ccc" : accentColor,
              color: "white",
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </div>
      </main>
    </>
  );
}

function ToggleBtn({ active, onClick, color, children }: { active: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 14px",
        borderRadius: 8,
        border: "none",
        background: active ? color : "transparent",
        color: active ? "white" : "#888",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 6,
        border: active ? "1px solid #6366f1" : "1px solid transparent",
        background: active ? "rgba(99,102,241,0.1)" : "transparent",
        color: active ? "#6366f1" : "#aaa",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
