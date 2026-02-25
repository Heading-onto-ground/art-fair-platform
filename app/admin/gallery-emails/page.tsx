"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";

type GalleryEmailRow = {
  id: string;
  galleryName: string;
  email: string;
  country?: string;
  language?: string;
};

type Stats = {
  total: number;
  active: number;
};

export default function AdminGalleryEmailsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [rows, setRows] = useState<GalleryEmailRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => null);
        if (data?.authenticated) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          router.replace("/admin/login");
        }
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!authenticated) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/gallery-emails?limit=1000", { credentials: "include" });
        const data = await res.json();
        if (data.ok) {
          setRows(data.rows || []);
          setStats(data.stats || null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authenticated]);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return (
      !q ||
      r.galleryName?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.country?.toLowerCase().includes(q)
    );
  });

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
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            Admin
          </span>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
            Gallery Emails
          </h1>
          {stats && (
            <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 6 }}>
              Total: {stats.total} · Active: {stats.active}
            </p>
          )}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or country..."
          style={{
            width: "100%",
            padding: "10px 14px",
            fontFamily: F,
            fontSize: 13,
            border: "1px solid #E8E3DB",
            background: "#FDFBF7",
            marginBottom: 20,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Loading...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F, fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E8E3DB" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B7355", fontWeight: 500, letterSpacing: "0.1em" }}>Gallery</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B7355", fontWeight: 500, letterSpacing: "0.1em" }}>Email</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B7355", fontWeight: 500, letterSpacing: "0.1em" }}>Country</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B7355", fontWeight: 500, letterSpacing: "0.1em" }}>Language</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #F0ECE6" }}>
                  <td style={{ padding: "9px 12px", color: "#1A1A1A" }}>{r.galleryName}</td>
                  <td style={{ padding: "9px 12px", color: "#555" }}>{r.email}</td>
                  <td style={{ padding: "9px 12px", color: "#8A8580" }}>{r.country || "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#8A8580" }}>{r.language || "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "20px 12px", color: "#B0AAA2", textAlign: "center" }}>No results</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
