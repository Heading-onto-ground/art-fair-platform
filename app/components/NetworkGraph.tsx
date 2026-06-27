"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { F } from "@/lib/design";

export type GraphNode = { id: string; label: string; type: "artist" | "gallery"; artistId: string | null };
export type GraphEdge = { source: string; target: string; type: "exhibited" | "co_present" | "witnessed" | "follows" };

const EDGE_STYLE: Record<GraphEdge["type"], { color: string; width: number; dash?: string; label: string }> = {
  co_present: { color: "#8B7355", width: 1.6, label: "함께 모임/전시" },
  witnessed: { color: "#5A7A5A", width: 1.2, label: "목격·반응" },
  follows: { color: "#C9C2B6", width: 0.8, label: "팔로우" },
  exhibited: { color: "#C2A36B", width: 1, dash: "4 3", label: "갤러리 전시" },
};

type Pos = { x: number; y: number };

/** Deterministic, dependency-free force-directed layout (runs once per data change). */
function computeLayout(nodes: GraphNode[], edges: GraphEdge[]): Map<string, Pos> {
  const pos = new Map<string, Pos>();
  const n = nodes.length;
  if (n === 0) return pos;

  const R = 400;
  nodes.forEach((node, i) => {
    const angle = (i / n) * Math.PI * 2;
    // slight radius variation keeps initial layout from being a perfect ring
    const r = R * (0.55 + 0.45 * ((i * 2654435761) % 1000) / 1000);
    pos.set(node.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  });

  const idx = new Map(nodes.map((node, i) => [node.id, i]));
  const links = edges
    .map((e) => ({ s: idx.get(e.source), t: idx.get(e.target) }))
    .filter((l): l is { s: number; t: number } => l.s !== undefined && l.t !== undefined);

  const arr = nodes.map((node) => pos.get(node.id)!);
  const ITER = 300;
  const k = 90; // ideal edge length
  const repulsion = 9000;

  for (let it = 0; it < ITER; it++) {
    const disp = arr.map(() => ({ x: 0, y: 0 }));
    // repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = arr[i].x - arr[j].x;
        let dy = arr[i].y - arr[j].y;
        let dist2 = dx * dx + dy * dy;
        if (dist2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist2 = 0.01; }
        const dist = Math.sqrt(dist2);
        const force = repulsion / dist2;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[i].x += fx; disp[i].y += fy;
        disp[j].x -= fx; disp[j].y -= fy;
      }
    }
    // attraction along edges
    for (const l of links) {
      const dx = arr[l.s].x - arr[l.t].x;
      const dy = arr[l.s].y - arr[l.t].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist * dist) / (k * 1000);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      disp[l.s].x -= fx; disp[l.s].y -= fy;
      disp[l.t].x += fx; disp[l.t].y += fy;
    }
    const cooling = 1 - it / ITER;
    const maxStep = 30 * cooling + 1;
    for (let i = 0; i < n; i++) {
      // gravity toward center
      disp[i].x -= arr[i].x * 0.012;
      disp[i].y -= arr[i].y * 0.012;
      const d = Math.sqrt(disp[i].x * disp[i].x + disp[i].y * disp[i].y) || 0.01;
      const step = Math.min(d, maxStep);
      arr[i].x += (disp[i].x / d) * step;
      arr[i].y += (disp[i].y / d) * step;
    }
  }

  nodes.forEach((node, i) => pos.set(node.id, arr[i]));
  return pos;
}

export default function NetworkGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const router = useRouter();

  const { pos, viewBox } = useMemo(() => {
    const p = computeLayout(nodes, edges);
    if (p.size === 0) return { pos: p, viewBox: "-500 -500 1000 1000" };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const { x, y } of p.values()) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    const pad = 80;
    return { pos: p, viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.map((n) => n.id).join(","), edges.map((e) => `${e.source}>${e.target}:${e.type}`).join(",")]);

  if (nodes.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>표시할 노드가 없습니다.</p>
      </div>
    );
  }

  const usedTypes = [...new Set(edges.map((e) => e.type))];

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", background: "#FDFBF7" }}>
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
        <g>
          {edges.map((e, i) => {
            const a = pos.get(e.source);
            const b = pos.get(e.target);
            if (!a || !b) return null;
            const s = EDGE_STYLE[e.type];
            return (
              <line
                key={`${e.source}-${e.target}-${e.type}-${i}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} strokeOpacity={0.55}
              />
            );
          })}
        </g>
        <g>
          {nodes.map((node) => {
            const p = pos.get(node.id);
            if (!p) return null;
            const isArtist = node.type === "artist";
            const color = isArtist ? "#4A7A8B" : "#8B7355";
            const r = isArtist ? 6 : 8;
            const clickable = isArtist && node.artistId;
            return (
              <g
                key={node.id}
                transform={`translate(${p.x}, ${p.y})`}
                style={{ cursor: clickable ? "pointer" : "default" }}
                onClick={() => { if (clickable) router.push(`/artist/public/${encodeURIComponent(node.artistId!)}`); }}
              >
                <title>{node.label}</title>
                <circle r={r} fill={color} stroke="#FDFBF7" strokeWidth={1.5} />
                <text x={0} y={r + 11} textAnchor="middle" fontFamily={F} fontSize={9} fill="#4A4A4A">
                  {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(253,251,247,0.92)", border: "1px solid #E8E3DB", padding: "12px 14px" }}>
        <div style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8B7355", marginBottom: 8 }}>연결의 종류</div>
        {usedTypes.length === 0 ? (
          <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580" }}>아직 연결이 없습니다.</div>
        ) : usedTypes.map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ display: "inline-block", width: 18, height: 0, borderTop: `${EDGE_STYLE[t].width + 1}px ${EDGE_STYLE[t].dash ? "dashed" : "solid"} ${EDGE_STYLE[t].color}` }} />
            <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>{EDGE_STYLE[t].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
