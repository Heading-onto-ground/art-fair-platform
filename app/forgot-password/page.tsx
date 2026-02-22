"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Role = "artist" | "gallery";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("artist");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");

  const emailLower = useMemo(() => email.trim().toLowerCase(), [email]);

  async function onRequest() {
    setMessage("");
    setStatus("idle");
    if (!emailLower) {
      setStatus("error");
      setMessage("이메일을 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, email: emailLower }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as any;
        setStatus("error");
        setMessage(String(data?.error || "요청에 실패했습니다."));
        return;
      }
      setSent(true);
      setStatus("success");
      setMessage("6자리 코드를 이메일로 보냈습니다. 코드를 입력해주세요.");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ margin: "0 0 12px" }}>비밀번호 재설정</h1>
      <p style={{ margin: "0 0 16px", color: "#555" }}>
        이메일로 6자리 코드를 보내고, 코드로 비밀번호를 재설정합니다.
      </p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>역할</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
        >
          <option value="artist">artist</option>
          <option value="gallery">gallery</option>
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>이메일</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
        />
      </div>

      <button
        type="button"
        onClick={onRequest}
        disabled={loading}
        style={{ padding: "10px 12px" }}
      >
        {loading ? "처리 중..." : "코드 보내기"}
      </button>

      {sent ? (
        <>
          <button
            type="button"
            onClick={() => router.push("/reset-password")}
            style={{ padding: "10px 12px" }}
          >
            다음
          </button>
        </>
      ) : null}

      {message ? (
        <p
          role="status"
          style={{
            marginTop: 12,
            color: status === "success" ? "green" : status === "error" ? "crimson" : "#555",
          }}
        >
          {message}
        </p>
      ) : null}

      <p style={{ marginTop: 16 }}>
        <Link href="/login">로그인으로 돌아가기</Link>
      </p>
    </main>
  );
}

