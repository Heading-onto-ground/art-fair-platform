"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { useAutoLocale } from "@/lib/useAutoLocale";
import { t, getAvailableLanguages } from "@/lib/translate";
import { F, S } from "@/lib/design";

type Role = "artist" | "gallery";
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

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    });
    return (await res.json().catch(() => null)) as MeResponse | null;
  } catch {
    return null;
  }
}

export default function TopBar() {
  const router = useRouter();
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

  useEffect(() => {
    setMounted(true);
    (async () => { const m = await fetchMe(); setMe(m); })();
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

  useEffect(() => {
    if (!me?.session) return;
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        if (data.notifications) { setNotifications(data.notifications); setUnreadCount(data.unreadCount || 0); }
      } catch (e) { console.error("Failed to fetch notifications:", e); }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [me?.session]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
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
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "mark_all_read" }) });
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
    const m = await fetchMe(); setMe(m);
    router.push("/login"); router.refresh();
  }

  function navigate(path: string) {
    setMobileMenuOpen(false);
    router.push(path);
  }

  const session = me?.session;

  const artistLinks = [
    { path: "/artist/me", label: t("nav_profile", lang) },
    { path: "/open-calls", label: t("nav_open_calls", lang) },
    { path: "/galleries", label: t("nav_galleries", lang) },
    { path: "/community", label: t("nav_community", lang) },
    { path: "/shipments", label: t("nav_shipments", lang) },
    { path: "/chat", label: t("nav_messages", lang) },
  ];

  const galleryLinks = [
    { path: "/gallery/me", label: t("nav_profile", lang) },
    { path: "/artists", label: t("nav_artists", lang) },
    { path: "/galleries", label: t("nav_galleries", lang) },
    { path: "/gallery", label: t("nav_my_calls", lang) },
    { path: "/shipments", label: t("nav_shipments", lang) },
    { path: "/chat", label: t("nav_messages", lang) },
    { path: "/admin/outreach", label: t("nav_growth", lang) },
  ];

  const navLinks = session?.role === "artist" ? artistLinks : session?.role === "gallery" ? galleryLinks : [];

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
              {navLinks.map((link) => (
                <NavBtn key={link.path} onClick={() => router.push(link.path)}>{link.label}</NavBtn>
              ))}

              {/* Notification bell (gallery only) */}
              {session.role === "gallery" && (
                <div ref={notifRef} style={{ position: "relative", marginLeft: 4 }}>
                  <button onClick={() => setShowNotifications(!showNotifications)} style={{ padding: "8px 10px", border: "none", background: "transparent", color: unreadCount > 0 ? "#8B7355" : "#B0AAA2", fontSize: 15, cursor: "pointer", position: "relative" }}>
                    🔔
                    {unreadCount > 0 && (
                      <span style={{ position: "absolute", top: 2, right: 2, background: "#8B7355", color: "#FFF", fontSize: 9, fontWeight: 600, minWidth: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 320, maxHeight: 400, overflowY: "auto", background: "#FFFFFF", border: "1px solid #E8E3DB", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", zIndex: 100 }}>
                      <div style={{ padding: "14px 18px", borderBottom: "1px solid #E8E3DB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8580" }}>{t("notifications", lang)}</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} style={{ background: "transparent", border: "none", color: "#8B7355", fontSize: 10, cursor: "pointer", fontFamily: F, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("mark_all_read", lang)}</button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 32, textAlign: "center", color: "#B0AAA2", fontFamily: F, fontSize: 12 }}>{t("no_notifications", lang)}</div>
                      ) : (
                        notifications.slice(0, 10).map((notif) => (
                          <div key={notif.id} onClick={() => handleNotificationClick(notif)} style={{ padding: "14px 18px", borderBottom: "1px solid #F0EBE3", cursor: "pointer", background: notif.read ? "transparent" : "rgba(139,115,85,0.04)", transition: "background 0.2s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = notif.read ? "transparent" : "rgba(139,115,85,0.04)"; }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {!notif.read && <span style={{ width: 5, height: 5, background: "#8B7355", borderRadius: "50%", flexShrink: 0 }} />}
                              <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, color: notif.read ? "#B0AAA2" : "#1A1A1A", letterSpacing: "0.04em" }}>{notif.title}</span>
                            </div>
                            <p style={{ margin: "6px 0 0", fontFamily: F, fontSize: 12, color: notif.read ? "#B0AAA2" : "#4A4A4A", lineHeight: 1.5 }}>{notif.message}</p>
                            <span style={{ display: "block", marginTop: 6, fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{new Date(notif.createdAt).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

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
                  {session.role === "artist" ? t("artist", lang) : t("gallery", lang)}
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

          {session?.role === "gallery" && unreadCount > 0 && (
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
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 40,
          }}
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
              {session.role === "artist" ? t("artist", lang) : t("gallery", lang)}
              {mounted && country && <span style={{ marginLeft: 8, color: "#B0AAA2" }}>{country}</span>}
            </div>

            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "16px 24px",
                  border: "none",
                  background: "transparent",
                  color: "#4A4A4A",
                  fontFamily: F,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {link.label}
              </button>
            ))}

            {/* Notifications (gallery) */}
            {session.role === "gallery" && notifications.length > 0 && (
              <div style={{ borderTop: "1px solid #F0EBE3", margin: "4px 0" }}>
                <div style={{ padding: "12px 24px 4px", fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8A8580" }}>
                  {t("notifications", lang)} {unreadCount > 0 && `(${unreadCount})`}
                </div>
                {notifications.slice(0, 5).map((notif) => (
                  <div key={notif.id} onClick={() => { handleNotificationClick(notif); setMobileMenuOpen(false); }}
                    style={{ padding: "10px 24px", cursor: "pointer", background: notif.read ? "transparent" : "rgba(139,115,85,0.04)" }}>
                    <div style={{ fontFamily: F, fontSize: 11, fontWeight: notif.read ? 400 : 600, color: notif.read ? "#B0AAA2" : "#1A1A1A" }}>{notif.title}</div>
                    <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", marginTop: 2 }}>{notif.message.slice(0, 60)}...</div>
                  </div>
                ))}
              </div>
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
              onClick={() => navigate("/login")}
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid #1A1A1A",
                background: "#1A1A1A",
                color: "#FDFBF7",
                fontFamily: F,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
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
    </>
  );
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: "8px 14px", border: "none", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", transition: "color 0.3s ease" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#1A1A1A"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "#8A8580"; }}>
      {children}
    </button>
  );
}
