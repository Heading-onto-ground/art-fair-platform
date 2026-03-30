"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import NotificationsBell from "./NotificationsBell";
import { useRouter, usePathname } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { useAutoLocale } from "@/lib/useAutoLocale";
import { t, getAvailableLanguages } from "@/lib/translate";
import { F, S } from "@/lib/design";
import { useUserSupportAlerts } from "@/lib/useUserSupportAlerts";

type Role = "artist" | "gallery" | "curator";
type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: number;
};

type NavItem = { path: string; label: string };
type NavEntry = NavItem | { label: string; items: NavItem[] };

const ME_CACHE_KEY = "afp_topbar_me_v1";
const ME_CACHE_TTL_MS = 30_000;

function readCachedMe(): MeResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: MeResponse };
    if (!parsed?.ts || !parsed?.data) return null;
    if (Date.now() - parsed.ts > ME_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedMe(data: MeResponse | null) {
  if (typeof window === "undefined" || !data) return;
  try {
    sessionStorage.setItem(ME_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore cache errors
  }
}

function clearCachedMe() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ME_CACHE_KEY);
  } catch {
    // ignore cache errors
  }
}

async function fetchMe(options?: { preferCache?: boolean }): Promise<MeResponse | null> {
  if (options?.preferCache) {
    const cached = readCachedMe();
    if (cached) return cached;
  }
  try {
    const res = await fetch("/api/auth/me?lite=1", {
      cache: "default",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as MeResponse | null;
    if (data) writeCachedMe(data);
    return data;
  } catch {
    return null;
  }
}

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const { lang, setLang } = useLanguage();
  const { country, language } = useAutoLocale();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const cached = readCachedMe();
    if (cached) {
      setMe(cached);
    }
    (async () => {
      const m = await fetchMe({ preferCache: !cached });
      if (m) setMe(m);
    })();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (language && language !== lang) setLang(language);
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [language, lang, setLang, mounted]);

  useEffect(() => {
    const session = me?.session;
    const profile = me?.profile;
    if (!session || !profile || !country) return;
    if (profile.country) return;
    const key = `afp_region_applied_${session.userId}`;
    if (localStorage.getItem(key)) return;
    const payload = session.role === "artist"
      ? { artistId: profile.artistId, name: profile.name, startedYear: profile.startedYear, genre: profile.genre, instagram: profile.instagram, country, city: profile.city ?? "", website: profile.website, bio: profile.bio, portfolioUrl: profile.portfolioUrl }
      : { galleryId: profile.galleryId, name: profile.name, address: profile.address, foundedYear: profile.foundedYear, instagram: profile.instagram, country, city: profile.city ?? "", website: profile.website, bio: profile.bio };
    fetch("/api/profile/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).finally(() => { localStorage.setItem(key, "1"); });
  }, [me?.session, me?.profile, country]);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      const mapped = (data.items ?? []).map((item: any) => ({
        id: item.id, type: "community_new_post", title: item.payload?.title ?? "새 글", message: "", read: true, createdAt: item.createdAt,
      }));
      setNotifications(mapped);
    } catch (e) { console.error("Failed to fetch notifications:", e); }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    }
    function handleEsc(e: KeyboardEvent) { if (e.key === "Escape") setShowNotifications(false); }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => { document.removeEventListener("mousedown", handleClickOutside); document.removeEventListener("keydown", handleEsc); };
  }, []);

  async function markAsRead(id: string) {
    try {
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "mark_read", notificationId: id }) });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications", { method: "PATCH", credentials: "include" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  }

  function handleNotificationClick(notif: Notification) {
    if (!notif.read) markAsRead(notif.id);
    if (notif.link) router.push(notif.link);
    setShowNotifications(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    clearCachedMe();
    const m = await fetchMe({ preferCache: false }); setMe(m);
    router.push("/login"); router.refresh();
  }

  function navigate(path: string) {
    setMobileMenuOpen(false);
    setMobileOpenGroup(null);
    router.push(path);
  }

  const session = me?.session;

  const trToast = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;
  const { toastOpen, dismissToast, unreadCount: supportUnread } = useUserSupportAlerts(!!session);

  // ── Grouped nav entries ──────────────────────────────────────────────────
  const artistNav = useMemo((): NavEntry[] => [
    { path: "/artist/me", label: lang === "ko" ? "내 페이지" : lang === "ja" ? "マイページ" : "MY PAGE" },
    { path: "/open-calls", label: t("nav_open_calls", lang) },
    {
      label: lang === "ko" ? "탐색" : lang === "ja" ? "探索" : "EXPLORE",
      items: [
        { path: "/artist/portfolio", label: lang === "ko" ? "내 작업" : lang === "ja" ? "マイ作品" : "MY WORKS" },
        { path: "/artist/me#applications", label: t("nav_my_calls", lang) },
        { path: "/discover", label: lang === "ko" ? "발견" : lang === "ja" ? "発見" : "DISCOVER" },
        { path: "/artists", label: t("nav_artists", lang) },
        { path: "/galleries", label: t("nav_galleries", lang) },
        { path: "/curators", label: lang === "ko" ? "큐레이터" : lang === "ja" ? "キュレーター" : "CURATORS" },
        { path: "/spaces", label: lang === "ko" ? "공간" : lang === "ja" ? "スペース" : "SPACES" },
      ],
    },
    {
      label: lang === "ko" ? "커뮤니티" : lang === "ja" ? "コミュニティ" : "COMMUNITY",
      items: [
        { path: "/feed", label: lang === "ko" ? "피드" : "FEED" },
        { path: "/network", label: lang === "ko" ? "네트워크" : "NETWORK" },
        { path: "/community", label: t("nav_community", lang) },
        { path: "/contact", label: lang === "ko" ? "문의" : lang === "ja" ? "お問い合わせ" : "CONTACT" },
      ],
    },
    { path: "/about", label: "ABOUT" },
  ], [lang]);

  const galleryNav = useMemo((): NavEntry[] => [
    { path: "/gallery/me", label: t("nav_my_page", lang) },
    { path: "/gallery", label: t("nav_my_calls", lang) },
    { path: "/artists", label: t("nav_artists", lang) },
    {
      label: lang === "ko" ? "더 보기" : lang === "ja" ? "もっと見る" : "MORE",
      items: [
        { path: "/open-calls", label: t("nav_open_calls", lang) },
        { path: "/galleries", label: t("nav_galleries", lang) },
        { path: "/community", label: t("nav_community", lang) },
        { path: "/admin/outreach", label: t("nav_growth", lang) },
        { path: "/contact", label: lang === "ko" ? "문의" : lang === "ja" ? "お問い合わせ" : "CONTACT" },
      ],
    },
    { path: "/about", label: "ABOUT" },
  ], [lang]);

  const curatorNav = useMemo((): NavEntry[] => [
    { path: "/curator", label: t("nav_my_page", lang) },
    { path: "/artists", label: t("nav_artists", lang) },
    { path: "/open-calls", label: t("nav_open_calls", lang) },
    {
      label: lang === "ko" ? "더 보기" : lang === "ja" ? "もっと見る" : "MORE",
      items: [
        { path: "/galleries", label: t("nav_galleries", lang) },
        { path: "/curators", label: lang === "ko" ? "큐레이터" : "CURATORS" },
        { path: "/community", label: t("nav_community", lang) },
        { path: "/contact", label: lang === "ko" ? "문의" : lang === "ja" ? "お問い合わせ" : "CONTACT" },
      ],
    },
    { path: "/about", label: "ABOUT" },
  ], [lang]);

  const navEntries = useMemo(
    () => session?.role === "artist" ? artistNav : session?.role === "gallery" ? galleryNav : session?.role === "curator" ? curatorNav : [],
    [session?.role, artistNav, galleryNav, curatorNav]
  );

  // All flat nav paths for prefetching
  const allNavPaths = useMemo(() => {
    const paths: string[] = [];
    for (const entry of navEntries) {
      if ("path" in entry) paths.push(entry.path);
      else entry.items.forEach((i) => paths.push(i.path));
    }
    return paths;
  }, [navEntries]);

  useEffect(() => {
    for (const p of allNavPaths) router.prefetch(p);
  }, [router, allNavPaths]);

  function isActive(path: string): boolean {
    if (path.includes("#")) return pathname === path.split("#")[0];
    return pathname === path || (path !== "/" && pathname.startsWith(path + "/"));
  }

  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#FDFBF7", borderBottom: "1px solid #E8E3DB", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <div onClick={() => navigate("/")} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: S, fontSize: 22, fontWeight: 600, color: "#1A1A1A", letterSpacing: "0.05em" }} suppressHydrationWarning>
            ROB
          </span>
          <span className="hide-mobile" style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8580" }} suppressHydrationWarning>
            Role of Bridge
          </span>
          {mounted && country && (
            <span className="hide-mobile" style={{ fontFamily: F, fontSize: 9, fontWeight: 500, color: "#8B7355", letterSpacing: "0.1em" }}>
              {country}
            </span>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="desktop-nav" style={{ display: "flex", gap: 0, alignItems: "center" }}>
          {session ? (
            <>
              {navEntries.map((entry) =>
                "path" in entry ? (
                  <NavBtn
                    key={entry.path}
                    onClick={() => router.push(entry.path)}
                    active={isActive(entry.path)}
                  >
                    {entry.label}
                  </NavBtn>
                ) : (
                  <NavDropdown
                    key={entry.label}
                    label={entry.label}
                    items={entry.items}
                    onNavigate={(path) => router.push(path)}
                    isActive={entry.items.some((i) => isActive(i.path))}
                  />
                )
              )}

              {/* Add Exhibition CTA — artist only */}
              {session.role === "artist" && (
                <button
                  onClick={() => router.push("/exhibitions/new")}
                  style={{ padding: "7px 14px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginLeft: 8, marginRight: 4, whiteSpace: "nowrap" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#3A3A3A"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#1A1A1A"; }}
                >
                  + {lang === "ko" ? "전시 기록" : lang === "ja" ? "展示を記録" : "ADD EXHIBITION"}
                </button>
              )}

              {/* Admin support messages */}
              <button
                type="button"
                onClick={() => router.push("/support")}
                aria-label={trToast("Messages to admin", "관리자 쪽지", "管理者メッセージ", "Messages admin")}
                style={{
                  position: "relative",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "8px 10px",
                  color: supportUnread > 0 ? "#8B7355" : "#B0AAA2",
                }}
              >
                💬
                {supportUnread > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      background: "#B85450",
                      color: "#FFF",
                      fontSize: 9,
                      fontWeight: 600,
                      minWidth: 14,
                      height: 14,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: F,
                    }}
                  >
                    {supportUnread > 9 ? "9+" : supportUnread}
                  </span>
                )}
              </button>

              {/* Notification bell */}
              <NotificationsBell />

              <div style={{ width: 1, height: 20, background: "#E8E3DB", margin: "0 16px" }} />

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as any)}
                  style={{ padding: "4px 8px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 9, fontWeight: 500, cursor: "pointer", outline: "none" }}
                >
                  {getAvailableLanguages().map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
                <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8580" }}>
                  {session.role === "artist" ? t("artist", lang) : session.role === "curator" ? t("curator", lang) : t("gallery", lang)}
                </span>
                <button onClick={logout} style={{ padding: "8px 18px", border: "1px solid #E8E3DB", background: "transparent", color: "#4A4A4A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1A1A1A"; e.currentTarget.style.color = "#1A1A1A"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; e.currentTarget.style.color = "#4A4A4A"; }}>
                  {t("nav_logout", lang)}
                </button>
              </div>
            </>
          ) : (
            <>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                style={{ padding: "4px 8px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 9, fontWeight: 500, cursor: "pointer", outline: "none", marginRight: 12 }}
              >
                {getAvailableLanguages().map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
              <button
                onClick={() => router.push("/about")}
                style={{ padding: "8px 12px", border: "1px solid #E8E3DB", background: "transparent", color: "#4A4A4A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", marginRight: 8 }}
              >
                About
              </button>
              <button
                onClick={() => router.push("/contact")}
                style={{ padding: "8px 12px", border: "1px solid #E8E3DB", background: "transparent", color: "#4A4A4A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", marginRight: 8 }}
              >
                {lang === "ko" ? "문의" : lang === "ja" ? "お問い合わせ" : "Contact"}
              </button>
              <button onClick={() => router.push("/login")} style={{ padding: "10px 28px", border: "1px solid #1A1A1A", background: "transparent", color: "#1A1A1A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#1A1A1A"; e.currentTarget.style.color = "#FDFBF7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1A1A1A"; }}>
                {t("enter", lang)}
              </button>
            </>
          )}
        </nav>

        {/* Mobile: hamburger + lang + notification */}
        <div className="mobile-nav-controls" style={{ display: "none", alignItems: "center", gap: 8 }}>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            style={{ padding: "4px 6px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 9, fontWeight: 500, cursor: "pointer", outline: "none" }}
          >
            {getAvailableLanguages().map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>

          {session && (
            <button
              type="button"
              onClick={() => navigate("/support")}
              aria-label={trToast("Messages to admin", "관리자 쪽지", "管理者メッセージ", "Messages admin")}
              style={{
                position: "relative",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                padding: "6px 8px",
                color: supportUnread > 0 ? "#8B7355" : "#B0AAA2",
              }}
            >
              💬
              {supportUnread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    background: "#B85450",
                    color: "#FFF",
                    fontSize: 8,
                    fontWeight: 600,
                    minWidth: 12,
                    height: 12,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: F,
                  }}
                >
                  {supportUnread > 9 ? "+" : supportUnread}
                </span>
              )}
            </button>
          )}

          {session && unreadCount > 0 && (
            <span style={{ background: "#8B7355", color: "#FFF", fontSize: 9, fontWeight: 600, minWidth: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            style={{
              padding: "8px",
              border: "none",
              background: "transparent",
              color: "#1A1A1A",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <div
        className="mobile-menu-panel"
        style={{
          position: "fixed",
          top: 52,
          left: 0,
          right: 0,
          background: "#FDFBF7",
          borderBottom: "1px solid #E8E3DB",
          zIndex: 45,
          transform: mobileMenuOpen ? "translateY(0)" : "translateY(-110%)",
          transition: "transform 0.3s ease",
          maxHeight: "calc(100vh - 52px)",
          overflowY: "auto",
          boxShadow: mobileMenuOpen ? "0 8px 32px rgba(0,0,0,0.08)" : "none",
        }}
      >
        {session ? (
          <div style={{ padding: "8px 0" }}>
            {/* Role badge */}
            <div style={{ padding: "16px 24px 8px", fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B7355" }}>
              {session.role === "artist" ? t("artist", lang) : session.role === "curator" ? t("curator", lang) : t("gallery", lang)}
              {mounted && country && <span style={{ marginLeft: 8, color: "#B0AAA2" }}>{country}</span>}
            </div>

            {session.role === "artist" && (
              <button
                onClick={() => navigate("/exhibitions/new")}
                style={{ display: "block", width: "100%", padding: "14px 24px", border: "none", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "left", cursor: "pointer", marginBottom: 4 }}
              >
                + {lang === "ko" ? "전시 기록" : lang === "ja" ? "展示を記録" : "ADD EXHIBITION"}
              </button>
            )}

            {navEntries.map((entry) =>
              "path" in entry ? (
                <button
                  key={entry.path}
                  onClick={() => navigate(entry.path)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "16px 24px",
                    border: "none",
                    borderLeft: isActive(entry.path) ? "3px solid #1A1A1A" : "3px solid transparent",
                    background: "transparent",
                    color: isActive(entry.path) ? "#1A1A1A" : "#4A4A4A",
                    fontFamily: F,
                    fontSize: 12,
                    fontWeight: isActive(entry.path) ? 600 : 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {entry.label}
                </button>
              ) : (
                <div key={entry.label}>
                  <button
                    onClick={() => setMobileOpenGroup(mobileOpenGroup === entry.label ? null : entry.label)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      padding: "16px 24px",
                      border: "none",
                      borderLeft: entry.items.some((i) => isActive(i.path)) ? "3px solid #8B7355" : "3px solid transparent",
                      background: "transparent",
                      color: entry.items.some((i) => isActive(i.path)) ? "#8B7355" : "#4A4A4A",
                      fontFamily: F,
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {entry.label}
                    <span style={{ fontSize: 9, color: "#B0AAA2" }}>{mobileOpenGroup === entry.label ? "▲" : "▼"}</span>
                  </button>
                  {mobileOpenGroup === entry.label && (
                    <div style={{ borderTop: "1px solid #F0EBE3", background: "#FAF8F4" }}>
                      {entry.items.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "13px 36px",
                            border: "none",
                            background: isActive(item.path) ? "rgba(139,115,85,0.06)" : "transparent",
                            color: isActive(item.path) ? "#8B7355" : "#6A6660",
                            fontFamily: F,
                            fontSize: 11,
                            fontWeight: isActive(item.path) ? 600 : 400,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {/* Logout */}
            <div style={{ borderTop: "1px solid #E8E3DB", padding: "8px 0" }}>
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "16px 24px",
                  border: "none",
                  background: "transparent",
                  color: "#8B4A4A",
                  fontFamily: F,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {t("nav_logout", lang)}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "16px 24px" }}>
            <button
              onClick={() => navigate("/about")}
              style={{ width: "100%", padding: "12px", border: "1px solid #E8E3DB", background: "transparent", color: "#4A4A4A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", cursor: "pointer", marginBottom: 8 }}
            >
              About
            </button>
            <button
              onClick={() => navigate("/contact")}
              style={{ width: "100%", padding: "12px", border: "1px solid #E8E3DB", background: "transparent", color: "#4A4A4A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", cursor: "pointer", marginBottom: 8 }}
            >
              {lang === "ko" ? "문의" : lang === "ja" ? "お問い合わせ" : "Contact"}
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{ width: "100%", padding: "14px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {t("enter", lang)}
            </button>
          </div>
        )}
      </div>

      {/* CSS for show/hide desktop vs mobile nav */}
      <style jsx global>{`
        .desktop-nav { display: flex !important; }
        .mobile-nav-controls { display: none !important; }
        .mobile-menu-panel { display: none; }
        .mobile-menu-overlay { display: none; }
        .hide-mobile { display: inline; }

        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav-controls { display: flex !important; }
          .mobile-menu-panel { display: block !important; }
          .mobile-menu-overlay { display: block !important; }
          .hide-mobile { display: none !important; }
          header { padding: 12px 16px !important; }
        }
      `}</style>

      {toastOpen ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 200,
            maxWidth: 360,
            border: "1px solid #E8E3DB",
            background: "#FFFFFF",
            boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            padding: "16px 18px",
          }}
        >
          <p style={{ fontFamily: F, fontSize: 13, lineHeight: 1.6, color: "#1A1A1A", margin: "0 0 12px" }}>
            {trToast(
              "You have a new message from the ROB team. Open Messages to read it.",
              "ROB 관리자로부터 새 쪽지가 도착했습니다. 쪽지에서 확인하세요.",
              "ROB管理者から新しいメッセージがあります。メッセージ画面でご確認ください。",
              "Nouveau message de l'equipe ROB. Ouvrez Messages pour le lire."
            )}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => { dismissToast(); router.push("/support"); }}
              style={{ padding: "8px 16px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {trToast("Open messages", "쪽지 열기", "メッセージを開く", "Ouvrir")}
            </button>
            <button
              type="button"
              onClick={dismissToast}
              style={{ padding: "8px 16px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {trToast("Dismiss", "닫기", "閉じる", "Fermer")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ── NavBtn with active indicator ─────────────────────────────────────────
function NavBtn({ onClick, children, active }: { onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        padding: "8px 14px",
        border: "none",
        background: "transparent",
        color: active ? "#1A1A1A" : "#8A8580",
        fontFamily: F,
        fontSize: 10,
        fontWeight: active ? 600 : 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "color 0.2s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#1A1A1A"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = active ? "#1A1A1A" : "#8A8580"; }}
    >
      {children}
      {active && (
        <span style={{
          position: "absolute",
          bottom: 2,
          left: "50%",
          transform: "translateX(-50%)",
          width: 16,
          height: 1,
          background: "#1A1A1A",
        }} />
      )}
    </button>
  );
}

// ── NavDropdown ───────────────────────────────────────────────────────────
function NavDropdown({
  label,
  items,
  onNavigate,
  isActive,
}: {
  label: string;
  items: NavItem[];
  onNavigate: (path: string) => void;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          position: "relative",
          padding: "8px 14px",
          border: "none",
          background: "transparent",
          color: isActive ? "#8B7355" : open ? "#1A1A1A" : "#8A8580",
          fontFamily: F,
          fontSize: 10,
          fontWeight: isActive ? 600 : 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "color 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {label}
        <span style={{ fontSize: 7, opacity: 0.6, marginTop: 1 }}>{open ? "▲" : "▼"}</span>
        {isActive && (
          <span style={{
            position: "absolute",
            bottom: 2,
            left: "50%",
            transform: "translateX(-50%)",
            width: 16,
            height: 1,
            background: "#8B7355",
          }} />
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#FDFBF7",
            border: "1px solid #E8E3DB",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            minWidth: 180,
            zIndex: 100,
            padding: "6px 0",
          }}
        >
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => { setOpen(false); onNavigate(item.path); }}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 18px",
                border: "none",
                background: "transparent",
                color: "#4A4A4A",
                fontFamily: F,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textAlign: "left",
                cursor: "pointer",
                transition: "background 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F0E8"; e.currentTarget.style.color = "#1A1A1A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4A4A4A"; }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
