"use client";

import { F, S } from "@/lib/design";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FDFBF7",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div
          style={{
            fontFamily: F,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#8B4A4A",
            marginBottom: 16,
          }}
        >
          Something went wrong
        </div>
        <h1
          style={{
            fontFamily: S,
            fontSize: 32,
            fontWeight: 300,
            color: "#1A1A1A",
            margin: "0 0 16px",
          }}
        >
          Unexpected Error
        </h1>
        <p
          style={{
            fontFamily: F,
            fontSize: 13,
            color: "#8A8580",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          We encountered an unexpected error. Please try again or return to the home page.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "14px 28px",
              border: "none",
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
            Try Again
          </button>
          <a
            href="/"
            style={{
              padding: "14px 28px",
              border: "1px solid #E8E3DB",
              background: "transparent",
              color: "#8A8580",
              fontFamily: F,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Home
          </a>
        </div>
      </div>
    </main>
  );
}
