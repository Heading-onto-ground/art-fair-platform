"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";

type AgentLog = {
  date: string;
  fileName: string;
  updatedAt: number;
  content: string;
};

export default function AdminAgentLogsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => null);
        if (!data?.authenticated) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agent-logs?limit=30", { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && Array.isArray(data.logs)) {
        setLogs(data.logs);
        if (!selectedDate && data.logs.length > 0) {
          setSelectedDate(String(data.logs[0].date));
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const selected = useMemo(() => logs.find((l) => l.date === selectedDate) || null, [logs, selectedDate]);

  if (authenticated === null) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FDFBF7" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Authenticating...</p>
      </main>
    );
  }
  if (!authenticated) return null;

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 40px" }}>
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>Admin</span>
          <h1 style={{ fontFamily: S, fontSize: 38, fontWeight: 300, marginTop: 8, color: "#1A1A1A" }}>Agent Daily Logs</h1>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 8 }}>
            Daily logs are auto-generated at 18:00 KST and shown here for review.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
          <section style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", minHeight: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #E8E3DB" }}>
              <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8580" }}>Dates</span>
              <button
                onClick={loadLogs}
                disabled={loading}
                style={{ border: "1px solid #E8E3DB", background: "transparent", padding: "5px 8px", fontFamily: F, fontSize: 10, color: "#4A4A4A", cursor: loading ? "wait" : "pointer" }}
              >
                {loading ? "..." : "Refresh"}
              </button>
            </div>
            {logs.length === 0 ? (
              <div style={{ padding: 14, fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>
                {loading ? "Loading..." : "No daily logs yet."}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 1, background: "#F2EEE7" }}>
                {logs.map((log) => (
                  <button
                    key={log.fileName}
                    onClick={() => setSelectedDate(log.date)}
                    style={{
                      textAlign: "left",
                      border: "none",
                      background: selectedDate === log.date ? "#FAF8F4" : "#FFFFFF",
                      padding: "10px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontFamily: F, fontSize: 12, color: "#1A1A1A" }}>{log.date}</div>
                    <div style={{ fontFamily: F, fontSize: 10, color: "#A49E96", marginTop: 3 }}>
                      {new Date(log.updatedAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", minHeight: 520 }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #E8E3DB" }}>
              <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8580" }}>
                {selected ? selected.date : "Log Detail"}
              </span>
            </div>
            <div style={{ padding: 16 }}>
              {!selected ? (
                <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>Select a date to view the full log.</p>
              ) : (
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 12, color: "#2A2A2A", lineHeight: 1.6 }}>
                  {selected.content}
                </pre>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

