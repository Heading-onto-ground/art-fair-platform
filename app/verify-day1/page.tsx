"use client";

/**
 * Day 1 verification page (web).
 * Tests: api/auth/me, profile.artistId
 * Access: /verify-day1
 */

import { useState } from "react";
import Link from "next/link";

interface AuthMeResponse {
  session: { userId: string; role: string; email?: string } | null;
  profile: { artistId?: string; userId?: string; name?: string; role?: string; [k: string]: unknown } | null;
  error?: string;
  details?: string;
}

export default function VerifyDay1Page() {
  const [result, setResult] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const runVerification = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/auth/me?lite=1", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as AuthMeResponse;
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const hasArtistId =
    !!result?.profile &&
    typeof (result.profile as { artistId?: string }).artistId === "string" &&
    (result.profile as { artistId: string }).artistId.length > 0;

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto", fontFamily: "system-ui" }}>
      <Link href="/" style={{ color: "#5A7A5A", fontSize: 14, marginBottom: 16, display: "block" }}>
        ← 뒤로
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Day 1 검증 (웹)</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        api/auth/me, profile.artistId 확인
      </p>

      <button
        onClick={runVerification}
        disabled={loading}
        style={{
          padding: "12px 24px",
          backgroundColor: "#1a1a1a",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "검증 중..." : "검증 실행"}
      </button>

      {result && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 4,
          }}
        >
          <h2 style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            결과
          </h2>
          <p
            style={{
              fontSize: 16,
              color: hasArtistId ? "#059669" : result.session ? "#d97706" : "#dc2626",
              fontWeight: hasArtistId ? 500 : 400,
              marginBottom: 16,
            }}
          >
            {!result.session
              ? "❌ 세션 없음 (미로그인)"
              : !result.profile
                ? "⚠️ 세션 있음, 프로필 없음"
                : !hasArtistId
                  ? "⚠️ profile.artistId 없음"
                  : `✅ OK — artistId: ${(result.profile as { artistId: string }).artistId}`}
          </p>
          <pre
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: "#4b5563",
              lineHeight: 1.5,
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(
              {
                session: result.session,
                profile: result.profile
                  ? {
                      artistId: (result.profile as { artistId?: string }).artistId,
                      userId: result.profile.userId,
                      name: result.profile.name,
                      role: result.profile.role,
                    }
                  : null,
                error: result.error,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
