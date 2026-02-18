"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { CardSkeleton } from "@/app/components/Skeleton";
import { F, S } from "@/lib/design";

type Status = {
  rlsDisabledTables: number;
  rlsEnabledNoPolicyTables: number;
  apiTableGrants: number;
  schemaUsageGrants: number;
  functionExecuteGrants: number;
};

export default function AdminSecurityPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadStatus() {
    const res = await fetch("/api/admin/security-fix", {
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error(data?.error || "failed to load status");
    setStatus(data.status as Status);
  }

  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const authData = await authRes.json().catch(() => null);
        if (!authData?.authenticated) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        setAuthenticated(true);
        await loadStatus();
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function runFix() {
    setRunning(true);
    setErr(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/security-fix", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "failed to apply");
      setMessage(
        `Applied. RLS disabled: ${data.before.rlsDisabledTables} -> ${data.after.rlsDisabledTables}, no-policy tables: ${data.before.rlsEnabledNoPolicyTables} -> ${data.after.rlsEnabledNoPolicyTables}, API table grants: ${data.before.apiTableGrants} -> ${data.after.apiTableGrants}, schema usage grants: ${data.before.schemaUsageGrants} -> ${data.after.schemaUsageGrants}, function execute grants: ${data.before.functionExecuteGrants} -> ${data.after.functionExecuteGrants}`
      );
      await loadStatus();
    } catch (e: any) {
      setErr(e?.message || "Failed to apply security fix");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "40px" }}>
        <div style={{ marginBottom: 22 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8B7355",
            }}
          >
            Admin
          </span>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
            Security Hardening
          </h1>
        </div>

        {authenticated === null || loading ? (
          <CardSkeleton count={3} />
        ) : (
          <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: "22px 24px" }}>
            <p style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", lineHeight: 1.7, marginTop: 0 }}>
              Enable RLS on all public tables and revoke broad table grants from API roles (`anon`,
              `authenticated`). This addresses the common Supabase Security Advisor warnings shown in your
              screenshot.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginTop: 14,
                marginBottom: 16,
              }}
            >
              <Metric label="RLS Disabled Tables" value={status?.rlsDisabledTables ?? 0} />
              <Metric
                label="RLS Enabled (No Policy)"
                value={status?.rlsEnabledNoPolicyTables ?? 0}
              />
              <Metric label="API Table Grants (anon/authenticated)" value={status?.apiTableGrants ?? 0} />
              <Metric label="Schema Usage Grants" value={status?.schemaUsageGrants ?? 0} />
              <Metric label="Function Execute Grants" value={status?.functionExecuteGrants ?? 0} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={runFix}
                disabled={running}
                style={{
                  padding: "11px 18px",
                  border: "1px solid #1A1A1A",
                  background: "#1A1A1A",
                  color: "#FFFFFF",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: running ? "wait" : "pointer",
                  opacity: running ? 0.7 : 1,
                }}
              >
                {running ? "Applying..." : "Apply Security Fix"}
              </button>

              <button
                onClick={loadStatus}
                disabled={running}
                style={{
                  padding: "11px 18px",
                  border: "1px solid #E8E3DB",
                  background: "transparent",
                  color: "#4A4A4A",
                  fontFamily: F,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: running ? "not-allowed" : "pointer",
                }}
              >
                Refresh Status
              </button>
            </div>

            {err ? (
              <div
                style={{
                  marginTop: 14,
                  border: "1px solid #E7C7C7",
                  background: "#FFF7F7",
                  color: "#8B3A3A",
                  fontFamily: F,
                  fontSize: 12,
                  padding: "10px 12px",
                }}
              >
                {err}
              </div>
            ) : null}

            {message ? (
              <div
                style={{
                  marginTop: 14,
                  border: "1px solid #D5E6CF",
                  background: "#F7FCF5",
                  color: "#48633E",
                  fontFamily: F,
                  fontSize: 12,
                  padding: "10px 12px",
                }}
              >
                {message}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #E8E3DB", background: "#FDFBF7", padding: "12px 14px" }}>
      <div
        style={{
          fontFamily: F,
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#8A8580",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: S, fontSize: 28, color: "#1A1A1A", fontWeight: 300 }}>{value}</div>
    </div>
  );
}

