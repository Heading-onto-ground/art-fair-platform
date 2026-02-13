"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { F, S } from "@/lib/design";

export default function AdminTopBar() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
      router.replace("/admin/login");
    } catch {
      router.replace("/admin/login");
    }
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: "1px solid #E8E3DB",
        background: "rgba(253,251,247,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 40px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo + Admin label */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/admin/outreach")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: S,
                fontSize: 22,
                fontWeight: 400,
                color: "#1A1A1A",
                letterSpacing: "0.02em",
              }}
            >
              ROB
            </span>
            <span
              style={{
                fontFamily: F,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#8B7355",
                padding: "3px 8px",
                border: "1px solid #8B7355",
              }}
            >
              Admin
            </span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <NavLink onClick={() => router.push("/admin/outreach")} label="Dashboard" />
          <NavLink onClick={() => router.push("/admin/users")} label="Users" />
          <NavLink onClick={() => router.push("/")} label="View Site" />

          <div
            style={{
              width: 1,
              height: 20,
              background: "#E8E3DB",
              margin: "0 4px",
            }}
          />

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              background: "transparent",
              border: "1px solid #E8E3DB",
              padding: "6px 16px",
              fontFamily: F,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8A8580",
              cursor: loggingOut ? "wait" : "pointer",
            }}
          >
            {loggingOut ? "..." : "Logout"}
          </button>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        fontFamily: F,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.06em",
        color: "#8A8580",
        cursor: "pointer",
        padding: "4px 0",
        textTransform: "uppercase",
      }}
    >
      {label}
    </button>
  );
}
