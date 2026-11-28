"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePublicHref } from "@/app/components/history/LocaleUrl";
import { splitLocalePath } from "@/lib/history/localeUrl";
import { F, colors } from "@/lib/design";

type Tab = "home" | "ritual" | "explore" | "calls" | "profile" | "now";

type Props = {
  lang: string;
  activeTab?: Tab;
  onCreate?: () => void;
};

const labels = {
  en: { menu: "Main menu", home: "Home", ritual: "Ritual", record: "Record", calls: "Calls", me: "Me", login: "Login" },
  ko: { menu: "주요 메뉴", home: "홈", ritual: "리추얼", record: "기록하기", calls: "오픈콜", me: "마이", login: "로그인" },
  ja: { menu: "主なメニュー", home: "ホーム", ritual: "リチュアル", record: "記録する", calls: "機会", me: "自分", login: "ログイン" },
  "zh-Hans": { menu: "主菜单", home: "首页", ritual: "仪式", record: "记录", calls: "征集", me: "我的", login: "登录" },
  "zh-Hant": { menu: "主選單", home: "首頁", ritual: "儀式", record: "記錄", calls: "徵集", me: "我的", login: "登入" },
} as const;

export default function ArtistBottomNav({ lang, activeTab, onCreate }: Props) {
  const copy = labels[lang as keyof typeof labels] ?? labels.en;
  const router = useRouter();
  const pathname = usePathname();
  const publicHref = usePublicHref();
  const path = splitLocalePath(pathname || "/").path;
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
    path === "/" || path.startsWith("/artist/portfolio") ? "home"
    : path.startsWith("/artist/ritual") ? "ritual"
    : path.startsWith("/explore") ? "explore"
    : path.startsWith("/artist/me") ? "profile"
    : path.startsWith("/open-calls") ? "calls"
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
      router.push(publicHref("/login?role=artist&redirect=/artist/ritual"));
      return;
    }
    onCreate?.();
  }

  return (
    <nav
      className="artist-bottom-nav"
      aria-label={copy.menu}
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
      <button type="button" style={itemStyle(tab === "home")} onClick={() => router.push(publicHref("/"))}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>{tab === "home" ? "⌂" : "○"}</span>
        {copy.home}
      </button>
      <button type="button" style={itemStyle(tab === "ritual")} onClick={() => router.push(publicHref("/artist/ritual"))}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>🔥</span>
        {copy.ritual}
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
        aria-label={copy.record}
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
      <button type="button" style={itemStyle(tab === "calls")} onClick={() => router.push(publicHref("/open-calls"))}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>◈</span>
        {copy.calls}
      </button>
      <button
        type="button"
        style={itemStyle(tab === "profile")}
        onClick={() => router.push(publicHref(isLoggedIn && isArtist ? "/artist/me" : "/login?role=artist&redirect=/artist/me"))}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>◎</span>
        {isLoggedIn && isArtist ? copy.me : copy.login}
      </button>
    </nav>
  );
}
