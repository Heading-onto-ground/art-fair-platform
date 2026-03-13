"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";

type Node = { id: string; label: string; type: "artist" | "gallery"; sub: string; image: string | null; artistId: string | null; x?: number; y?: number; vx?: number; vy?: number };
type Edge = { source: string; target: string; type: string };

export default function NetworkPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<Node | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragging = useRef<{ node: Node | null; panStart: { x: number; y: number; tx: number; ty: number } | null }>({ node: null, panStart: null });

  useEffect(() => {
    fetch("/api/network?limit=80")
      .then(r => r.json())
      .then(d => {
        const n: Node[] = (d.nodes ?? []).map((node: Node) => ({
          ...node,
          x: Math.random() * 900 + 50,
          y: Math.random() * 600 + 50,
          vx: 0, vy: 0,
        }));
        setNodes(n);
        setEdges(d.edges ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return;
    let frame: number;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const simulate = () => {
      const alpha = 0.05;
      const repulsion = 4000;
      const attraction = 0.02;
      const centerX = 500, centerY = 350;

      for (const n of nodes) {
        // Gravity toward center
        n.vx = (n.vx ?? 0) * 0.85 + (centerX - (n.x ?? 0)) * 0.003;
        n.vy = (n.vy ?? 0) * 0.85 + (centerY - (n.y ?? 0)) * 0.003;

        // Repulsion
        for (const m of nodes) {
          if (m.id === n.id) continue;
          const dx = (n.x ?? 0) - (m.x ?? 0);
          const dy = (n.y ?? 0) - (m.y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          n.vx += (dx / dist) * force * alpha;
          n.vy += (dy / dist) * force * alpha;
        }
      }

      // Attraction along edges
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const dx = (t.x ?? 0) - (s.x ?? 0);
        const dy = (t.y ?? 0) - (s.y ?? 0);
        s.vx = (s.vx ?? 0) + dx * attraction;
        s.vy = (s.vy ?? 0) + dy * attraction;
        t.vx = (t.vx ?? 0) - dx * attraction;
        t.vy = (t.vy ?? 0) - dy * attraction;
      }

      for (const n of nodes) {
        n.x = (n.x ?? 0) + Math.max(-10, Math.min(10, n.vx ?? 0));
        n.y = (n.y ?? 0) + Math.max(-10, Math.min(10, n.vy ?? 0));
      }

      setNodes([...nodes]);
      frame = requestAnimationFrame(simulate);
    };

    frame = requestAnimationFrame(simulate);
    const stop = setTimeout(() => cancelAnimationFrame(frame), 6000);
    return () => { cancelAnimationFrame(frame); clearTimeout(stop); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Draw edges
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#8B7355";
    ctx.lineWidth = 1;
    for (const e of edges) {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;
      ctx.beginPath();
      ctx.moveTo(s.x ?? 0, s.y ?? 0);
      ctx.lineTo(t.x ?? 0, t.y ?? 0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Draw nodes
    for (const n of nodes) {
      const x = n.x ?? 0, y = n.y ?? 0;
      const r = n.type === "gallery" ? 10 : 7;
      const isHov = hovered?.id === n.id;

      ctx.beginPath();
      ctx.arc(x, y, r + (isHov ? 3 : 0), 0, Math.PI * 2);
      ctx.fillStyle = n.type === "gallery" ? "#8B7355" : "#4A7A8B";
      ctx.fill();

      if (isHov || n.type === "gallery") {
        ctx.fillStyle = "#1A1A1A";
        ctx.font = `${n.type === "gallery" ? 10 : 9}px sans-serif`;
        ctx.fillText(n.label, x + r + 4, y + 4);
      }
    }

    ctx.restore();
  }, [nodes, edges, hovered, transform]);

  const getNodeAt = (cx: number, cy: number) => {
    const ix = (cx - transform.x) / transform.scale;
    const iy = (cy - transform.y) / transform.scale;
    for (const n of nodes) {
      const dx = (n.x ?? 0) - ix, dy = (n.y ?? 0) - iy;
      if (Math.sqrt(dx * dx + dy * dy) < 14) return n;
    }
    return null;
  };

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8A8A8A" }}>Visualization</span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>Network Map</h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4A7A8B" }} />
              <span style={{ fontFamily: F, fontSize: 10, color: "#8A8A8A" }}>Artist</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#8B7355" }} />
              <span style={{ fontFamily: F, fontSize: 10, color: "#8A8A8A" }}>Gallery</span>
            </div>
          </div>
        </div>

        {loading ? (
          <p style={{ fontFamily: F, color: "#B0AAA2" }}>Loading network...</p>
        ) : (
          <div style={{ border: "1px solid #E8E3DB", background: "#FDFBF7", position: "relative", overflow: "hidden" }}>
            <canvas
              ref={canvasRef}
              width={1000}
              height={700}
              style={{ display: "block", width: "100%", cursor: hovered ? "pointer" : "grab" }}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const scaleX = 1000 / rect.width;
                const cx = (e.clientX - rect.left) * scaleX;
                const cy = (e.clientY - rect.top) * scaleX;
                if (dragging.current.panStart && !dragging.current.node) {
                  const { x: sx, y: sy, tx, ty } = dragging.current.panStart;
                  setTransform(t => ({ ...t, x: tx + (cx - sx), y: ty + (cy - sy) }));
                } else if (dragging.current.node) {
                  const n = dragging.current.node;
                  n.x = (cx - transform.x) / transform.scale;
                  n.y = (cy - transform.y) / transform.scale;
                  setNodes([...nodes]);
                } else {
                  setHovered(getNodeAt(cx, cy));
                }
              }}
              onMouseDown={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const scaleX = 1000 / rect.width;
                const cx = (e.clientX - rect.left) * scaleX;
                const cy = (e.clientY - rect.top) * scaleX;
                const node = getNodeAt(cx, cy);
                dragging.current = { node: node ?? null, panStart: !node ? { x: cx, y: cy, tx: transform.x, ty: transform.y } : null };
              }}
              onMouseUp={() => { dragging.current = { node: null, panStart: null }; }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const scaleX = 1000 / rect.width;
                const cx = (e.clientX - rect.left) * scaleX;
                const cy = (e.clientY - rect.top) * scaleX;
                const node = getNodeAt(cx, cy);
                if (node?.type === "artist" && node.artistId) {
                  router.push(`/artists/${encodeURIComponent(node.artistId)}`);
                }
              }}
              onWheel={e => {
                e.preventDefault();
                setTransform(t => {
                  const scale = Math.max(0.3, Math.min(3, t.scale * (e.deltaY > 0 ? 0.9 : 1.1)));
                  return { ...t, scale };
                });
              }}
            />
            {hovered && (
              <div style={{ position: "absolute", bottom: 16, left: 16, padding: "10px 16px", background: "rgba(255,255,255,0.95)", border: "1px solid #E8E3DB", fontFamily: F }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: hovered.type === "gallery" ? "#8B7355" : "#4A7A8B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  {hovered.type}
                </div>
                <div style={{ fontSize: 14, color: "#1A1A1A" }}>{hovered.label}</div>
                {hovered.sub && <div style={{ fontSize: 11, color: "#8A8A8A", marginTop: 2 }}>{hovered.sub}</div>}
              </div>
            )}
            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              {["+", "−"].map(s => (
                <button key={s} onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.3, Math.min(3, t.scale * (s === "+" ? 1.2 : 0.8))) }))} style={{ width: 28, height: 28, border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 14, cursor: "pointer" }}>
                  {s}
                </button>
              ))}
              <button onClick={() => setTransform({ x: 0, y: 0, scale: 1 })} style={{ width: 28, height: 28, border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 9, cursor: "pointer" }}>
                ⊙
              </button>
            </div>
            <p style={{ position: "absolute", top: 12, left: 12, fontFamily: F, fontSize: 10, color: "#B0AAA2", margin: 0 }}>
              {nodes.length} nodes · {edges.length} connections · scroll to zoom · drag to pan
            </p>
          </div>
        )}
      </main>
    </>
  );
}
