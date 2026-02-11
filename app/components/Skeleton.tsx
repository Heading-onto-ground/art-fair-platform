"use client";

import { F } from "@/lib/design";

/** Animated skeleton pulse block */
export function Skeleton({ width, height, radius = 0, style }: { width?: string | number; height?: string | number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        width: width ?? "100%",
        height: height ?? 16,
        borderRadius: radius,
        background: "linear-gradient(90deg, #F0ECE6 25%, #E8E3DB 50%, #F0ECE6 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/** Card skeleton for list items (open calls, artists, etc.) */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ background: "#FFFFFF", padding: "28px 32px" }}>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <Skeleton width={24} height={18} />
                  <Skeleton width={120} height={12} />
                </div>
                <Skeleton width="70%" height={22} style={{ marginBottom: 8 }} />
                <Skeleton width="90%" height={14} />
              </div>
              <div style={{ textAlign: "right" }}>
                <Skeleton width={60} height={10} style={{ marginBottom: 6 }} />
                <Skeleton width={90} height={18} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Grid card skeleton for artist/gallery cards */
export function GridCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ border: "1px solid #EEEAE5", overflow: "hidden" }}>
            <Skeleton width="100%" height={200} />
            <div style={{ padding: "18px 20px" }}>
              <Skeleton width="60%" height={18} style={{ marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <Skeleton width={60} height={20} radius={2} />
                <Skeleton width={40} height={20} radius={2} />
              </div>
              <Skeleton width="80%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Community post skeleton */
export function PostSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E8E3DB", padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Skeleton width={36} height={36} radius={18} />
              <div>
                <Skeleton width={100} height={14} style={{ marginBottom: 4 }} />
                <Skeleton width={140} height={10} />
              </div>
            </div>
            <Skeleton width="50%" height={22} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="85%" height={14} style={{ marginBottom: 20 }} />
            <div style={{ borderTop: "1px solid #F0EBE3", paddingTop: 16, display: "flex", gap: 24 }}>
              <Skeleton width={50} height={14} />
              <Skeleton width={80} height={14} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
