"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

export default function AdminTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const isAdminView = searchParams.get("adminView") === "1";
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;
  const isHomeActive = pathname === "/admin";
  const isDashboardActive = pathname === "/admin/outreach";
  const isUsersActive = pathname === "/admin/users";
  const isSourcesActive = pathname === "/admin/sources";
  const isAboutActive = pathname === "/admin/about";
  const isSecurityActive = pathname === "/admin/security";
  const isArtistDashboardPreview = pathname === "/artist" && isAdminView;
  const isArtistProfilePreview = pathname === "/artist/me" && isAdminView;
  const isGalleryDashboardPreview = pathname === "/gallery" && isAdminView;
  const isGalleryProfilePreview = pathname === "/gallery/me" && isAdminView;
  const isPreviewActive =
    isArtistDashboardPreview ||
    isArtistProfilePreview ||
    isGalleryDashboardPreview ||
    isGalleryProfilePreview;
  const isViewSiteActive = pathname === "/" && !isAdminView;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!previewRef.current) return;
      if (!previewRef.current.contains(e.target as Node)) {
        setPreviewOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setPreviewOpen(false);
  }, [pathname, searchParams]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
      router.replace("/admin/login");
    } catch {
      router.replace("/admin/login");
    }
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: "1px solid #E8E3DB",
        background: "rgba(253,251,247,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 40px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo + Admin label */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/admin")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: S,
                fontSize: 22,
                fontWeight: 400,
                color: "#1A1A1A",
                letterSpacing: "0.02em",
              }}
            >
              ROB
            </span>
            <span
              style={{
                fontFamily: F,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#8B7355",
                padding: "3px 8px",
                border: "1px solid #8B7355",
              }}
            >
              {tr("Admin", "관리자", "管理者", "Admin")}
            </span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <NavLink onClick={() => router.push("/admin")} label={tr("Home", "홈", "ホーム", "Accueil")} active={isHomeActive} />
          <NavLink onClick={() => router.push("/admin/outreach")} label={tr("Dashboard", "대시보드", "ダッシュボード", "Tableau")} active={isDashboardActive} />
          <NavLink onClick={() => router.push("/admin/users")} label={tr("Users", "가입자", "ユーザー", "Utilisateurs")} active={isUsersActive} />
          <NavLink onClick={() => router.push("/admin/sources")} label={tr("Sources", "소스", "ソース", "Sources")} active={isSourcesActive} />
          <NavLink onClick={() => router.push("/admin/about")} label={tr("About", "소개", "About", "About")} active={isAboutActive} />
          <NavLink onClick={() => router.push("/admin/security")} label={tr("Security", "보안", "セキュリティ", "Securite")} active={isSecurityActive} />
          <div ref={previewRef} style={{ position: "relative" }}>
            <button
              onClick={() => setPreviewOpen((p) => !p)}
              style={{
                background: "transparent",
                border: "none",
                fontFamily: F,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.06em",
                color: isPreviewActive ? "#1A1A1A" : "#8A8580",
                cursor: "pointer",
                padding: "4px 0",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tr("Preview", "미리보기", "プレビュー", "Apercu")}
              <span style={{ fontSize: 10, lineHeight: 1 }}>{previewOpen ? "▲" : "▼"}</span>
            </button>
            {previewOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  minWidth: 220,
                  border: "1px solid #E8E3DB",
                  background: "#FFFFFF",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  padding: "8px 0",
                  zIndex: 200,
                }}
              >
                <MenuItem
                  label={tr("Artist Dashboard", "아티스트 대시보드", "アーティストダッシュボード", "Tableau artiste")}
                  active={isArtistDashboardPreview}
                  onClick={() => {
                    setPreviewOpen(false);
                    router.push("/artist?adminView=1");
                  }}
                />
                <MenuItem
                  label={tr("Artist Profile", "아티스트 프로필", "アーティストプロフィール", "Profil artiste")}
                  active={isArtistProfilePreview}
                  onClick={() => {
                    setPreviewOpen(false);
                    router.push("/artist/me?adminView=1");
                  }}
                />
                <MenuItem
                  label={tr("Gallery Dashboard", "갤러리 대시보드", "ギャラリーダッシュボード", "Tableau galerie")}
                  active={isGalleryDashboardPreview}
                  onClick={() => {
                    setPreviewOpen(false);
                    router.push("/gallery?adminView=1");
                  }}
                />
                <MenuItem
                  label={tr("Gallery Profile", "갤러리 프로필", "ギャラリープロフィール", "Profil galerie")}
                  active={isGalleryProfilePreview}
                  onClick={() => {
                    setPreviewOpen(false);
                    router.push("/gallery/me?adminView=1");
                  }}
                />
              </div>
            )}
          </div>
          <NavLink onClick={() => router.push("/")} label={tr("View Site", "사이트 보기", "サイトを見る", "Voir le site")} active={isViewSiteActive} />

          <div
            style={{
              width: 1,
              height: 20,
              background: "#E8E3DB",
              margin: "0 4px",
            }}
          />

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              background: "transparent",
              border: "1px solid #E8E3DB",
              padding: "6px 16px",
              fontFamily: F,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8A8580",
              cursor: loggingOut ? "wait" : "pointer",
            }}
          >
            {loggingOut ? "..." : tr("Logout", "로그아웃", "ログアウト", "Déconnexion")}
          </button>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ onClick, label, active = false }: { onClick: () => void; label: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        fontFamily: F,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.06em",
        color: active ? "#1A1A1A" : "#8A8580",
        cursor: "pointer",
        padding: "4px 0",
        textTransform: "uppercase",
      }}
    >
      {label}
    </button>
  );
}

function MenuItem({ onClick, label, active = false }: { onClick: () => void; label: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        background: active ? "#FAF8F4" : "transparent",
        border: "none",
        padding: "10px 14px",
        fontFamily: F,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: active ? "#1A1A1A" : "#4A4A4A",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
