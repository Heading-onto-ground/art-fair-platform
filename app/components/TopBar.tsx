"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";
import { useAutoLocale } from "@/lib/useAutoLocale";
import { t } from "@/lib/translate";

type Role = "artist" | "gallery";
type MeResponse = {
  session: { userId: string; role: Role; email?: string } | null;
  profile: any | null;
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
  const { lang, setLang } = useLanguage();
  const { country, language } = useAutoLocale();

  useEffect(() => {
    (async () => {
      const m = await fetchMe();
      setMe(m);
    })();
  }, []);

  useEffect(() => {
    if (language && language !== lang) {
      setLang(language);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [language, lang, setLang]);

  useEffect(() => {
    const session = me?.session;
    const profile = me?.profile;
    if (!session || !profile || !country) return;
    if (profile.country) return;
    const key = `afp_region_applied_${session.userId}`;
    if (localStorage.getItem(key)) return;

    const payload =
      session.role === "artist"
        ? {
            artistId: profile.artistId,
            name: profile.name,
            startedYear: profile.startedYear,
            genre: profile.genre,
            instagram: profile.instagram,
            country,
            city: profile.city ?? "",
            website: profile.website,
            bio: profile.bio,
            portfolioUrl: profile.portfolioUrl,
          }
        : {
            galleryId: profile.galleryId,
            name: profile.name,
            address: profile.address,
            foundedYear: profile.foundedYear,
            instagram: profile.instagram,
            country,
            city: profile.city ?? "",
            website: profile.website,
            bio: profile.bio,
          };

    fetch("/api/profile/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).finally(() => {
      localStorage.setItem(key, "1");
    });
  }, [me?.session, me?.profile, country]);

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    const m = await fetchMe();
    setMe(m);

    router.push("/login");
    router.refresh();
  }

  const session = me?.session;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "white",
        borderBottom: "1px solid #e5e5e5",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Logo */}
      <div
        onClick={() => router.push("/")}
        style={{
          fontWeight: 800,
          fontSize: 18,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#111",
        }}
      >
        <span style={{ color: "#6366f1" }}>ROB</span>
        <span style={{ color: "#888", fontWeight: 400, fontSize: 14 }}>
          role of bridge
        </span>
        {country && (
          <span style={{ fontSize: 12, color: "#aaa", marginLeft: 4 }}>
            · {country}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {session ? (
          <>
            {session.role === "artist" ? (
              <>
                <NavButton onClick={() => router.push("/artist/me")}>
                  {t("my_profile", lang)}
                </NavButton>
                <NavButton onClick={() => router.push("/open-calls")}>
                  {t("open_calls", lang)}
                </NavButton>
                <NavButton onClick={() => router.push("/galleries")}>
                  {t("galleries", lang)}
                </NavButton>
                <NavButton onClick={() => router.push("/shipments")}>Shipments</NavButton>
                <NavButton onClick={() => router.push("/chat")}>Chat</NavButton>
              </>
            ) : (
              <>
                <NavButton onClick={() => router.push("/gallery/me")}>
                  {t("my_profile", lang)}
                </NavButton>
                <NavButton onClick={() => router.push("/artists")}>
                  {t("artists", lang)}
                </NavButton>
                <NavButton onClick={() => router.push("/galleries")}>
                  {t("galleries", lang)}
                </NavButton>
                <NavButton onClick={() => router.push("/gallery")}>
                  {t("my_open_calls", lang)}
                </NavButton>
                <NavButton onClick={() => router.push("/shipments")}>Shipments</NavButton>
                <NavButton onClick={() => router.push("/chat")}>Chat</NavButton>
              </>
            )}

            {/* User Info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginLeft: 8,
                padding: "6px 12px",
                background: "#f5f5f5",
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                }}
              />
              <span style={{ fontSize: 12, color: "#555" }}>
                {session.role === "artist" ? "🎨" : "🏛️"}{" "}
                {me?.profile?.name || session.userId.slice(0, 8)}
              </span>
            </div>

            <button
              onClick={logout}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e5e5e5",
                background: "white",
                color: "#888",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("logout", lang)}
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#6366f1",
              color: "white",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {t("login", lang)}
          </button>
        )}
      </nav>
    </header>
  );
}

function NavButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "none",
        background: "transparent",
        color: "#555",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
