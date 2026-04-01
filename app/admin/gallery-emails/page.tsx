"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";

type DiscoverResult = {
  citiesAttempted?: number;
  citiesWithResults?: number;
  profilesFetched?: number;
  profilesWithWebsite?: number;
  profilesWithEmail?: number;
  upserted?: number;
  error?: string;
};

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null);
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => null);
        if (data?.authenticated) setAuthenticated(true);
        else { setAuthenticated(false); router.replace("/admin/login"); }
      } catch { setAuthenticated(false); router.replace("/admin/login"); }
    })();
  }, [router]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery-emails?limit=1000", { credentials: "include" });
      const data = await res.json();
      if (data.ok) { setRows(data.rows || []); setStats(data.stats || null); }
    } finally { setLoading(false); }
  }

  useEffect(() => { if (authenticated) load(); }, [authenticated]);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return !q || r.galleryName?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.country?.toLowerCase().includes(q);
  });

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((r) => next.delete(r.id));
      else filtered.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function discoverGalleries() {
    if (discovering) return;
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      const res = await fetch("/api/cron/crawl-gallery-directory-sources?limit=150", { credentials: "include" });
      const data = await res.json();
      setDiscoverResult(data);
      if (data.ok) await load();
    } catch (e: unknown) {
      setDiscoverResult({ error: String(e) });
    } finally {
      setDiscovering(false);
    }
  }

  async function crawlEmails() {
    if (crawling) return;
    setCrawling(true);
    setCrawlResult(null);
    try {
      const res = await fetch("/api/cron/crawl-gallery-info", { credentials: "include" });
      const data = await res.json();
      setCrawlResult(data.ok ? `완료 — 처리: ${data.processed ?? "?"} / 업데이트: ${data.updated ?? "?"}` : `오류: ${data.error ?? "unknown"}`);
      if (data.ok) await load();
    } catch (e: unknown) {
      setCrawlResult(`오류: ${String(e)}`);
    } finally {
      setCrawling(false);
    }
  }

  async function deleteSelected() {
    if (!selected.size || deleting) return;
    if (!window.confirm(`${selected.size}개 항목을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/gallery-emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.ok) { setSelected(new Set()); await load(); }
      else alert(`삭제 실패: ${data.error}`);
    } finally { setDeleting(false); }
  }

  if (authenticated === null) return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FDFBF7" }}>
      <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Authenticating...</p>
    </main>
  );
  if (!authenticated) return null;

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>Admin</span>
          <h1 style={{ fontFamily: S, fontSize: 36, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>Gallery Emails</h1>
          {stats && <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 6 }}>Total: {stats.total} · Active: {stats.active}</p>}
        </div>

        {/* ── Discovery controls ── */}
        <div style={{ marginBottom: 28, padding: "20px 24px", border: "1px solid #E8E3DB", background: "#FDFBF7" }}>
          <p style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B7355", marginBottom: 14 }}>갤러리 발굴 파이프라인</p>
          <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 16, lineHeight: 1.6 }}>
            1단계: galleriesnow.net 25개 도시에서 갤러리 웹사이트 URL 수집<br />
            2단계: 각 웹사이트 방문 → 이메일 추출
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={discoverGalleries}
              disabled={discovering}
              style={{ padding: "10px 20px", border: "none", background: discovering ? "#E8E3DB" : "#1A1A1A", color: discovering ? "#8A8580" : "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: discovering ? "not-allowed" : "pointer" }}
            >
              {discovering ? "스크래핑 중..." : "1단계: 갤러리 URL 수집"}
            </button>
            <button
              onClick={crawlEmails}
              disabled={crawling}
              style={{ padding: "10px 20px", border: "1px solid #1A1A1A", background: crawling ? "#E8E3DB" : "transparent", color: crawling ? "#8A8580" : "#1A1A1A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: crawling ? "not-allowed" : "pointer" }}
            >
              {crawling ? "크롤링 중..." : "2단계: 이메일 추출"}
            </button>
          </div>
          {discoverResult && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: discoverResult.error ? "#FDF8F8" : "#F8FDF8", border: `1px solid ${discoverResult.error ? "#C0A0A0" : "#A0C0A0"}`, fontFamily: F, fontSize: 12 }}>
              {discoverResult.error ? (
                <span style={{ color: "#8B3A3A" }}>오류: {discoverResult.error}</span>
              ) : (
                <span style={{ color: "#3A5A3A" }}>
                  도시 {discoverResult.citiesWithResults}/{discoverResult.citiesAttempted} 성공 · 프로필 {discoverResult.profilesFetched}개 방문 · 웹사이트 {discoverResult.profilesWithWebsite}개 · 이메일 {discoverResult.profilesWithEmail}개 직접 확보 · DB 저장 {discoverResult.upserted}개
                </span>
              )}
            </div>
          )}
          {crawlResult && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#F8FDF8", border: "1px solid #A0C0A0", fontFamily: F, fontSize: 12, color: "#3A5A3A" }}>
              {crawlResult}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or country..."
            style={{ flex: 1, padding: "10px 14px", fontFamily: F, fontSize: 13, border: "1px solid #E8E3DB", background: "#FDFBF7", outline: "none" }}
          />
          <button
            onClick={deleteSelected}
            disabled={selected.size === 0 || deleting}
            style={{
              padding: "10px 18px", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
              border: "1px solid #C0392B", background: selected.size > 0 ? "#C0392B" : "#E8E3DB",
              color: selected.size > 0 ? "#FFF" : "#AAA", cursor: selected.size > 0 ? "pointer" : "not-allowed",
            }}
          >
            {deleting ? "..." : `삭제 (${selected.size})`}
          </button>
        </div>

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Loading...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F, fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E8E3DB" }}>
                <th style={{ padding: "8px 12px", width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B7355", fontWeight: 500, letterSpacing: "0.1em" }}>Gallery</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B7355", fontWeight: 500, letterSpacing: "0.1em" }}>Email</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B7355", fontWeight: 500, letterSpacing: "0.1em" }}>Country</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#8B7355", fontWeight: 500, letterSpacing: "0.1em" }}>Language</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #F0ECE6", background: selected.has(r.id) ? "#FDF8F2" : undefined }}>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                  </td>
                  <td style={{ padding: "9px 12px", color: "#1A1A1A" }}>{r.galleryName}</td>
                  <td style={{ padding: "9px 12px", color: "#555" }}>{r.email}</td>
                  <td style={{ padding: "9px 12px", color: "#8A8580" }}>{r.country || "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#8A8580" }}>{r.language || "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "20px 12px", color: "#B0AAA2", textAlign: "center" }}>No results</td></tr>
              )}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
