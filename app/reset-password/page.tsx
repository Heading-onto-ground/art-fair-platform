"use client";

import React, { useState } from "react";

type Role = "artist" | "gallery";

export default function ResetPasswordPage() {
  const [role, setRole] = useState<Role>("artist");
  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const emailLower = email.trim().toLowerCase();
    if (!emailLower || (role !== "artist" && role !== "gallery")) {
      setStatus("error");
      setMessage("유효한 이메일/역할 정보가 없습니다.");
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setStatus("error");
      setMessage("6자리 코드를 입력해주세요.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setStatus("error");
      setMessage("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setStatus("loading");
    try {
      const verifyRes = await fetch("/api/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailLower, role, otp: otp.trim() }),
      });
      const verifyData = (await verifyRes.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string } | null;
      if (!verifyRes.ok || !verifyData?.ok) {
        setStatus("error");
        setMessage(verifyData?.error || verifyData?.message || "코드 확인에 실패했습니다.");
        return;
      }

      const confirmRes = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      const data = (await confirmRes.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null;
      if (!confirmRes.ok || !data?.ok) {
        setStatus("error");
        setMessage(data?.error || data?.message || "실패했습니다.");
        return;
      }

      setStatus("success");
      setMessage(data?.message || "비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      setOtp("");
      setNewPassword("");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류가 발생했습니다.");
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ margin: "0 0 12px" }}>비밀번호 재설정</h1>
      <p style={{ margin: "0 0 16px", color: "#555" }}>
        이메일로 받은 6자리 코드로 새 비밀번호를 설정합니다.
      </p>

      <form onSubmit={onSubmit}>
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
            required
            style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>
            6자리 코드
          </label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>
            새 비밀번호
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          style={{ padding: "10px 12px" }}
        >
          {status === "loading" ? "처리 중..." : "비밀번호 변경"}
        </button>
      </form>

      {message ? (
        <p
          role="status"
          style={{
            marginTop: 12,
            color: status === "success" ? "green" : "crimson",
          }}
        >
          {message}
        </p>
      ) : null}

    </main>
  );
}

