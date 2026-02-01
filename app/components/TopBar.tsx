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

  const m = await fetchMe(); // ✅ 다시 확인
  setMe(m);

  router.push("/login");
  router.refresh();
}

  const session = me?.session;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "white",
        borderBottom: "1px solid #eee",
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontWeight: 900, cursor: "pointer" }} onClick={() => router.push("/")}>
        AFP {country ? `· ${country}` : ""}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {session ? (
          <>
            {session.role === "artist" ? (
              <>
                <button
                  onClick={() => router.push("/artist/me")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {t("my_profile", lang)}
                </button>
                <button
                  onClick={() => router.push("/open-calls")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {t("open_calls", lang)}
                </button>
                <button
                  onClick={() => router.push("/galleries")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {t("galleries", lang)}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push("/gallery/me")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {t("my_profile", lang)}
                </button>
                <button
                  onClick={() => router.push("/artists")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {t("artists", lang)}
                </button>
                <button
                  onClick={() => router.push("/galleries")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {t("galleries", lang)}
                </button>
                <button
                  onClick={() => router.push("/gallery")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {t("my_open_calls", lang)}
                </button>
              </>
            )}
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              {session.role} · {session.userId}
            </div>
            <button
              onClick={logout}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {t("logout", lang)}
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            {t("login", lang)}
          </button>
        )}
      </div>
    </div>
  );
}