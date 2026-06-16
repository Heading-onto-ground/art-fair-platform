"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { F, colors } from "@/lib/design";

type Tab = "home" | "explore" | "create" | "calls" | "profile";

type Props = {
  lang: string;
  activeTab?: Tab;
  onCreate?: () => void;
};

export default function ArtistBottomNav({ lang, activeTab, onCreate }: Props) {
  const ko = lang === "ko";
  const router = useRouter();
  const pathname = usePathname();
  const [isArtist, setIsArtist] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me?lite=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((me) => {
        setIsLoggedIn(!!me?.session);
        setIsArtist(me?.session?.role === "artist");
      })
      .catch(() => {
        setIsLoggedIn(false);
        setIsArtist(false);
      });
  }, []);

  const tab = activeTab ?? (
    pathname === "/" || pathname.startsWith("/artist/portfolio") ? "home"
    : pathname.startsWith("/explore") ? "explore"
    : pathname.startsWith("/artist/me") ? "profile"
    : pathname.startsWith("/open-calls") ? "calls"
    : "home"
  );

  const itemStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "10px 4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: active ? colors.textPrimary : colors.textMuted,
    fontFamily: F,
    fontSize: 9,
    fontWeight: active ? 600 : 400,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  });

  function handleCreate() {
    if (!isLoggedIn || !isArtist) {
      router.push("/login?role=artist&redirect=/");
      return;
    }
    onCreate?.();
  }

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 90,
        background: colors.bgPrimary,
        borderTop: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "stretch",
        maxWidth: 520,
        margin: "0 auto",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <button type="button" style={itemStyle(tab === "home")} onClick={() => router.push("/")}>
        <span style={{ fontSize: 18 }}>{tab === "home" ? "⌂" : "○"}</span>
        {ko ? "홈" : "Home"}
      </button>
      <button type="button" style={itemStyle(tab === "explore")} onClick={() => router.push("/explore")}>
        <span style={{ fontSize: 16 }}>⌕</span>
        {ko ? "탐색" : "Explore"}
      </button>
      <button
        type="button"
        onClick={handleCreate}
        style={{
          flex: "0 0 64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
        aria-label={ko ? "작업 올리기" : "New post"}
      >
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: `2px solid ${colors.textPrimary}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            lineHeight: 1,
            color: colors.textPrimary,
          }}
        >
          +
        </span>
      </button>
      <button type="button" style={itemStyle(tab === "calls")} onClick={() => router.push("/open-calls")}>
        <span style={{ fontSize: 16 }}>◈</span>
        {ko ? "오픈콜" : "Calls"}
      </button>
      <button
        type="button"
        style={itemStyle(tab === "profile")}
        onClick={() => router.push(isLoggedIn && isArtist ? "/artist/me" : "/login?role=artist&redirect=/artist/me")}
      >
        <span style={{ fontSize: 16 }}>◎</span>
        {isLoggedIn && isArtist ? (ko ? "마이" : "Me") : ko ? "로그인" : "Login"}
      </button>
    </nav>
  );
}
