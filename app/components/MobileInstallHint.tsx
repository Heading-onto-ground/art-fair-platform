"use client";

import { useEffect, useState } from "react";
import { F, colors } from "@/lib/design";

type Props = {
  lang: string;
};

export default function MobileInstallHint({ lang }: Props) {
  const ko = lang === "ko";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.localStorage.getItem("rob-install-dismissed") === "1") return;
    if (window.innerWidth > 768) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem("rob-install-dismissed", "1");
    setVisible(false);
  }

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(window as Window & { MSStream?: unknown }).MSStream;

  return (
    <div
      className="mobile-install-hint"
      style={{
        marginBottom: 16,
        padding: "12px 14px",
        border: `1px solid ${colors.border}`,
        background: colors.bgAccent,
        borderRadius: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <p
            style={{
              fontFamily: F,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: colors.accent,
              margin: "0 0 6px",
            }}
          >
            {ko ? "앱처럼 쓰기" : "Use like an app"}
          </p>
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, margin: 0, lineHeight: 1.55 }}>
            {isIOS
              ? ko
                ? "공유 버튼 → 홈 화면에 추가로 설치하면 더 편하게 쓸 수 있어요."
                : "Tap Share → Add to Home Screen for a faster, app-like experience."
              : ko
                ? "브라우저 메뉴에서 홈 화면에 추가하면 앱처럼 쓸 수 있어요."
                : "Add to Home Screen from your browser menu for an app-like experience."}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={ko ? "닫기" : "Dismiss"}
          style={{
            border: "none",
            background: "transparent",
            color: colors.textMuted,
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
