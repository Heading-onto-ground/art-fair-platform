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

  // ✅ URL ?role=artist|gallery 로 초기 role 선택
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "artist" || roleParam === "gallery") {
      setRole(roleParam);
    }
  }, [searchParams]);

  // ✅ 자동 리다이렉트 없음: 사용자가 직접 로그인/로그아웃 선택

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
        // ✅ role은 보내되, 최종 라우팅은 /api/auth/me 로 확인
        body: JSON.stringify({ role, email: e, password: p }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErr(data?.error ?? `로그인 실패 (${res.status})`);
        return;
      }

      // ✅ 중요: 서버 쿠키 기준으로 role 재확인 후 이동
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
    if (role === "artist") {
      if (!artistId || !name || !startedYear || !genre) {
        return setErr("작가 필수 정보를 모두 입력해주세요.");
      }
    }
    if (role === "gallery") {
      if (!galleryId || !name || !address || !foundedYear || !instagram) {
        return setErr("갤러리 필수 정보를 모두 입력해주세요.");
      }
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

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 520, margin: "30px auto", padding: "0 12px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>🔐 {t("login_title", lang)}</h1>

        <div
          style={{
            marginTop: 14,
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
          }}
        >
          {/* Role toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => {
                setRole("artist");
                setErr(null);
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: role === "artist" ? "#111" : "#fff",
                color: role === "artist" ? "#fff" : "#111",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              🎨 Artist
            </button>

            <button
              type="button"
              onClick={() => {
                setRole("gallery");
                setErr(null);
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: role === "gallery" ? "#111" : "#fff",
                color: role === "gallery" ? "#fff" : "#111",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              🏛️ Gallery
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: mode === "login" ? "#111" : "#fff",
                color: mode === "login" ? "#fff" : "#111",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {t("login_title", lang)}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: mode === "signup" ? "#111" : "#fff",
                color: mode === "signup" ? "#fff" : "#111",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {t("signup_title", lang)}
            </button>
          </div>

          {/* Email */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 12, opacity: 0.75 }}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
              }}
            />

            <label style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              type="password"
              autoComplete="current-password"
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onLogin();
              }}
            />
          </div>

          {mode === "signup" ? (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {role === "artist" ? (
                <>
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Artist ID</label>
                  <input
                    value={artistId}
                    onChange={(e) => setArtistId(e.target.value)}
                    placeholder="e.g., ART-0001"
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Artist Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Min Kim"
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Start Year</label>
                  <input
                    value={startedYear}
                    onChange={(e) => setStartedYear(e.target.value)}
                    placeholder="e.g., 2018"
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Genre</label>
                  <input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g., Painting"
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Instagram (optional)</label>
                  <input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/..."
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Portfolio URL (optional)</label>
                  <input
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://... (PDF or website)"
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                </>
              ) : (
                <>
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Gallery ID</label>
                  <input
                    value={galleryId}
                    onChange={(e) => setGalleryId(e.target.value)}
                    placeholder="e.g., GAL-0001"
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Gallery Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Aurora Gallery"
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Gallery Address</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address"
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Founded Year</label>
                  <input
                    value={foundedYear}
                    onChange={(e) => setFoundedYear(e.target.value)}
                    placeholder="e.g., 2010"
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Instagram</label>
                  <input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/..."
                    style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
                  />
                </>
              )}
            </div>
          ) : null}

          {err && <div style={{ marginTop: 10, color: "#c00" }}>{err}</div>}

          <button
            type="button"
            onClick={mode === "login" ? onLogin : onSignup}
            disabled={loading}
            style={{
              marginTop: 14,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            (MVP) 계정은 DB에 저장됩니다.
          </div>
        </div>
      </main>
    </>
  );
}
