"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { CardSkeleton } from "@/app/components/Skeleton";
import { F, S } from "@/lib/design";

type AdminUser = {
  id: string;
  email: string;
  role: "artist" | "gallery";
  createdAt: number;
  name: string;
  country: string;
  city: string;
  profileId: string;
};

type Stats = {
  total: number;
  artists: number;
  galleries: number;
  withProfile: number;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [roleFilter, setRoleFilter] = useState<"ALL" | "artist" | "gallery">("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => null);
        if (data?.authenticated) setAuthenticated(true);
        else {
          setAuthenticated(false);
          router.replace("/admin/login");
        }
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  async function loadUsers() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setStats(data?.stats ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load users");
      setUsers([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) loadUsers();
  }, [authenticated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.country ?? "").toLowerCase().includes(q) ||
        (u.city ?? "").toLowerCase().includes(q) ||
        (u.profileId ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, query]);

  const countryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      const key = (u.country || "").trim() || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));
  }, [users]);

  const maxCountryCount = countryStats[0]?.count ?? 1;

  function downloadCsv() {
    const header = [
      "email",
      "role",
      "name",
      "profileId",
      "country",
      "city",
      "createdAt",
      "userId",
    ];
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = users.map((u) =>
      [
        u.email,
        u.role,
        u.name,
        u.profileId,
        u.country,
        u.city,
        new Date(u.createdAt).toISOString(),
        u.id,
      ]
        .map(esc)
        .join(",")
    );

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `admin-users-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
              Admin
            </span>
            <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
              Users
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={downloadCsv}
              style={{
                padding: "10px 18px",
                border: "1px solid #1A1A1A",
                background: "#1A1A1A",
                color: "#FFFFFF",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Export CSV
            </button>
            <button
              onClick={loadUsers}
              style={{
                padding: "10px 18px",
                border: "1px solid #E5E0DB",
                background: "transparent",
                color: "#4A4A4A",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <CardSkeleton count={4} />
        ) : err ? (
          <div style={{ padding: 18, border: "1px solid #D4B0B0", background: "#FDF8F8", color: "#8B3A3A", fontFamily: F, fontSize: 12 }}>
            {err}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 20 }}>
              <StatCard label="Total" value={stats?.total ?? users.length} />
              <StatCard label="Artists" value={stats?.artists ?? users.filter((u) => u.role === "artist").length} />
              <StatCard label="Galleries" value={stats?.galleries ?? users.filter((u) => u.role === "gallery").length} />
              <StatCard label="With profile" value={stats?.withProfile ?? users.filter((u) => u.name !== "-").length} />
            </div>

            <div style={{ border: "1px solid #E5E0DB", background: "#FFFFFF", padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", marginBottom: 12 }}>
                Top Countries
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {countryStats.map((c) => (
                  <div key={c.country} style={{ display: "grid", gridTemplateColumns: "140px 1fr 40px", gap: 10, alignItems: "center" }}>
                    <div style={{ fontFamily: F, fontSize: 12, color: "#4A4A4A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.country}
                    </div>
                    <div style={{ width: "100%", height: 10, background: "#F3EFE9", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.max(6, Math.round((c.count / maxCountryCount) * 100))}%`,
                          height: "100%",
                          background: "#8B7355",
                        }}
                      />
                    </div>
                    <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", textAlign: "right" }}>{c.count}</div>
                  </div>
                ))}
                {countryStats.length === 0 && (
                  <div style={{ fontFamily: S, fontStyle: "italic", color: "#8A8580" }}>No country data</div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {(["ALL", "artist", "gallery"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    padding: "8px 14px",
                    border: r === roleFilter ? "1px solid #1A1A1A" : "1px solid #E5E0DB",
                    background: r === roleFilter ? "#1A1A1A" : "transparent",
                    color: r === roleFilter ? "#FFFFFF" : "#4A4A4A",
                    fontFamily: F,
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {r}
                </button>
              ))}

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search email / name / country / city / profileId"
                style={{
                  flex: "1 1 320px",
                  minWidth: 260,
                  padding: "9px 12px",
                  border: "1px solid #E5E0DB",
                  background: "#FFFFFF",
                  color: "#1A1A1A",
                  fontFamily: F,
                  fontSize: 12,
                }}
              />
            </div>

            <div style={{ border: "1px solid #E5E0DB", background: "#FFFFFF" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr 0.8fr 0.8fr 0.9fr", gap: 8, padding: "12px 14px", borderBottom: "1px solid #EDE7DE", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8580" }}>
                <div>Email / Name</div>
                <div>Role</div>
                <div>Location</div>
                <div>Profile ID</div>
                <div>Joined</div>
              </div>

              {filtered.map((u) => (
                <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr 0.8fr 0.8fr 0.9fr", gap: 8, padding: "12px 14px", borderBottom: "1px solid #F1ECE4", fontFamily: F, fontSize: 12, color: "#1A1A1A" }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{u.email}</div>
                    <div style={{ color: "#8A8580", marginTop: 2 }}>{u.name || "-"}</div>
                  </div>
                  <div style={{ textTransform: "uppercase", color: u.role === "artist" ? "#8B7355" : "#5A6A8B" }}>{u.role}</div>
                  <div>{[u.city, u.country].filter(Boolean).join(", ") || "-"}</div>
                  <div>{u.profileId || "-"}</div>
                  <div style={{ color: "#6A6A6A" }}>{new Date(u.createdAt).toLocaleDateString()}</div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", fontFamily: S, fontStyle: "italic", color: "#8A8580" }}>
                  No users found.
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #E5E0DB", background: "#FFFFFF", padding: "14px 16px" }}>
      <div style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: S, fontSize: 26, color: "#1A1A1A", fontWeight: 300 }}>{value}</div>
    </div>
  );
}

