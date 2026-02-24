"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F } from "@/lib/design";

type Run = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  error_sample: string | null;
  duration_ms: number | null;
};

// ── minimal SVG bar chart ─────────────────────────────────────────────────────
function BarChart({ runs }: { runs: Run[] }) {
  const W = 640, H = 160, PAD = 8, BOTTOM = 24;
  const inner_h = H - PAD - BOTTOM;

  // group by date (last 14)
  const byDate: Record<string, { updated: number; errors: number }> = {};
  for (const r of runs) {
    const d = r.started_at.slice(0, 10);
    if (!byDate[d]) byDate[d] = { updated: 0, errors: 0 };
    byDate[d].updated += r.updated;
    byDate[d].errors += r.errors;
  }
  const dates = Object.keys(byDate).sort().slice(-14);
  if (!dates.length) return null;

  const maxVal = Math.max(1, ...dates.map((d) => byDate[d].updated + byDate[d].errors));
  const bw = (W - PAD * 2) / dates.length;
  const gap = Math.max(1, bw * 0.15);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", maxWidth: W, height: "auto", display: "block" }}
    >
      {dates.map((d, i) => {
        const x = PAD + i * bw + gap / 2;
        const w = bw - gap;
        const { updated, errors } = byDate[d];
        const uh = Math.round((updated / maxVal) * inner_h);
        const eh = Math.round((errors / maxVal) * inner_h);
        const uy = PAD + inner_h - uh;
        const ey = PAD + inner_h - uh - eh;
        const label = d.slice(5); // MM-DD
        return (
          <g key={d}>
            {uh > 0 && <rect x={x} y={uy} width={w} height={uh} fill="#4ade80" opacity={0.85} rx={2} />}
            {eh > 0 && <rect x={x} y={ey} width={w} height={eh} fill="#f87171" opacity={0.85} rx={2} />}
            <text
              x={x + w / 2}
              y={H - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#888"
              fontFamily={F}
            >
              {label}
            </text>
          </g>
        );
      })}
      {/* legend */}
      <rect x={PAD} y={PAD} width={10} height={10} fill="#4ade80" rx={2} />
      <text x={PAD + 13} y={PAD + 9} fontSize={9} fill="#555" fontFamily={F}>updated</text>
      <rect x={PAD + 70} y={PAD} width={10} height={10} fill="#f87171" rx={2} />
      <text x={PAD + 83} y={PAD + 9} fontSize={9} fill="#555" fontFamily={F}>errors</text>
    </svg>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function CrawlGalleryInfoPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const meData = await me.json();
        if (!meData?.authenticated) { router.replace("/admin/login"); return; }
      } catch { router.replace("/admin/login"); return; }
      load();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crawl-gallery-info-runs?days=${days}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      setRuns(Array.isArray(data.runs) ? data.runs : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  function fmt(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("sv-SE").slice(0, 16).replace("T", " ");
  }

  const statusColor = (s: string) =>
    s === "success" ? "#16a34a" : s === "error" ? "#dc2626" : "#ca8a04";

  return (
    <div style={{ minHeight: "100vh", background: "#FDFBF7", fontFamily: F }}>
      <AdminTopBar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Gallery Info Crawler Runs</h1>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
          >
            {[7, 14, 30, 60].map((d) => (
              <option key={d} value={d}>{d}d</option>
            ))}
          </select>
          <button
            onClick={load}
            style={{ padding: "4px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>

        {/* chart */}
        {!loading && runs.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: "16px", marginBottom: 24 }}>
            <BarChart runs={runs} />
          </div>
        )}

        {/* table */}
        {loading ? (
          <p style={{ color: "#888", fontSize: 14 }}>Loading…</p>
        ) : runs.length === 0 ? (
          <p style={{ color: "#888", fontSize: 14 }}>No runs found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee" }}>
                  {["Started", "Status", "Proc", "Updated", "Skipped", "Errors", "ms", "Error sample"].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "5px 10px", whiteSpace: "nowrap", color: "#555" }}>{fmt(r.started_at)}</td>
                    <td style={{ padding: "5px 10px" }}>
                      <span style={{ color: statusColor(r.status), fontWeight: 600 }}>{r.status}</span>
                    </td>
                    <td style={{ padding: "5px 10px", textAlign: "right" }}>{r.processed}</td>
                    <td style={{ padding: "5px 10px", textAlign: "right", color: "#16a34a", fontWeight: 600 }}>{r.updated}</td>
                    <td style={{ padding: "5px 10px", textAlign: "right", color: "#888" }}>{r.skipped}</td>
                    <td style={{ padding: "5px 10px", textAlign: "right", color: r.errors > 0 ? "#dc2626" : "#888" }}>{r.errors}</td>
                    <td style={{ padding: "5px 10px", textAlign: "right", color: "#aaa" }}>
                      {r.duration_ms != null ? r.duration_ms.toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "5px 10px", color: "#dc2626", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.error_sample || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
