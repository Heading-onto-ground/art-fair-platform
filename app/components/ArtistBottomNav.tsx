"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { F, colors } from "@/lib/design";

type Tab = "home" | "ritual" | "explore" | "calls" | "profile";

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
    : pathname.startsWith("/artist/ritual") ? "ritual"
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
    gap: 3,
    padding: "8px 2px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: active ? colors.textPrimary : colors.textMuted,
    fontFamily: F,
    fontSize: 8,
    fontWeight: active ? 600 : 400,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    minWidth: 0,
    touchAction: "manipulation",
  });

  function handleCreate() {
    if (!isLoggedIn || !isArtist) {
      router.push("/login?role=artist&redirect=/artist/ritual");
      return;
    }
    onCreate?.();
  }

  return (
    <nav
      className="artist-bottom-nav"
      aria-label={ko ? "주요 메뉴" : "Main menu"}
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
        <span style={{ fontSize: 17, lineHeight: 1 }}>{tab === "home" ? "⌂" : "○"}</span>
        {ko ? "홈" : "Home"}
      </button>
      <button type="button" style={itemStyle(tab === "ritual")} onClick={() => router.push("/artist/ritual")}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>🔥</span>
        {ko ? "리추얼" : "Ritual"}
      </button>
      <button
        type="button"
        onClick={handleCreate}
        style={{
          flex: "0 0 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          touchAction: "manipulation",
        }}
        aria-label={ko ? "기록하기" : "Record"}
      >
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            border: `2px solid ${colors.textPrimary}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            lineHeight: 1,
            color: colors.textPrimary,
          }}
        >
          +
        </span>
      </button>
      <button type="button" style={itemStyle(tab === "calls")} onClick={() => router.push("/open-calls")}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>◈</span>
        {ko ? "오픈콜" : "Calls"}
      </button>
      <button
        type="button"
        style={itemStyle(tab === "profile")}
        onClick={() => router.push(isLoggedIn && isArtist ? "/artist/me" : "/login?role=artist&redirect=/artist/me")}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>◎</span>
        {isLoggedIn && isArtist ? (ko ? "마이" : "Me") : ko ? "로그인" : "Login"}
      </button>
    </nav>
  );
}
