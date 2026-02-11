"use client";

import { useRouter } from "next/navigation";
import { F, S } from "@/lib/design";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  context?: "apply" | "view" | "chat" | "general";
};

export default function SignupPromptModal({ isOpen, onClose, message, context = "general" }: Props) {
  const router = useRouter();

  if (!isOpen) return null;

  const contextMessages: Record<string, { title: string; subtitle: string }> = {
    apply: { title: "Apply to this open call", subtitle: "Create an account to submit your portfolio and apply directly to galleries." },
    view: { title: "See full details", subtitle: "Sign up to view complete open call information, gallery contacts, and application deadlines." },
    chat: { title: "Message the gallery", subtitle: "Create an account to connect directly with galleries and curators." },
    general: { title: "Join the network", subtitle: "Sign up to access open calls from galleries and institutions worldwide." },
  };

  const { title, subtitle } = contextMessages[context];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(26, 26, 26, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FDFBF7",
          border: "1px solid #E8E3DB",
          maxWidth: 440,
          width: "100%",
          padding: "48px 40px",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            border: "none",
            background: "transparent",
            color: "#B0AAA2",
            fontSize: 18,
            cursor: "pointer",
            padding: 4,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Content */}
        <div style={{ textAlign: "center" }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            Free account
          </span>
          <h2 style={{ fontFamily: S, fontSize: 28, fontWeight: 300, color: "#1A1A1A", marginTop: 12, marginBottom: 8 }}>
            {title}
          </h2>
          <p style={{ fontFamily: F, fontSize: 13, fontWeight: 300, color: "#8A8580", lineHeight: 1.7, marginBottom: 32 }}>
            {message || subtitle}
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <button
              onClick={() => router.push("/login?role=artist")}
              style={{
                width: "100%",
                padding: "16px",
                border: "none",
                background: "#1A1A1A",
                color: "#FDFBF7",
                fontFamily: F,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#8B7355"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1A1A1A"; }}
            >
              I am an Artist
            </button>
            <button
              onClick={() => router.push("/login?role=gallery")}
              style={{
                width: "100%",
                padding: "16px",
                border: "1px solid #1A1A1A",
                background: "transparent",
                color: "#1A1A1A",
                fontFamily: F,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1A1A1A"; e.currentTarget.style.color = "#FDFBF7"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1A1A1A"; }}
            >
              I am a Gallery
            </button>
          </div>

          <p style={{ fontFamily: F, fontSize: 11, color: "#B0AAA2", marginTop: 20 }}>
            Takes less than 2 minutes. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
