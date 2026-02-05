"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { SHIPMENT_STATUS_KO, SHIPMENT_STATUS_COLOR } from "@/lib/carriers";

type Shipment = {
  id: string;
  applicationId: string;
  carrier: string;
  carrierName: string;
  status: string;
  type: string;
  trackingNumber?: string;
  trackingUrl?: string;
  pickupDate?: string;
  pickupAddress: string;
  deliveryAddress: string;
  artworkTitle?: string;
  createdAt: string;
  application: {
    openCallId: string;
    galleryId: string;
  };
};

export default function ShipmentsPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/shipments", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setShipments(data.shipments || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <TopBar />
      <main style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>
              Shipments
            </h1>
            <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
              배송 예약 및 추적
            </p>
          </div>
          <button
            onClick={load}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #e5e5e5",
              background: "white",
              color: "#888",
              fontWeight: 500,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#888", padding: 20 }}>Loading...</p>
        ) : shipments.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              background: "white",
              border: "1px solid #e5e5e5",
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p style={{ color: "#888", marginBottom: 16 }}>
              아직 배송 예약이 없습니다.
              <br />
              전시 참여가 확정되면 배송을 예약할 수 있어요.
            </p>
            <button
              onClick={() => router.push("/artist/me")}
              style={{
                padding: "12px 20px",
                borderRadius: 8,
                border: "none",
                background: "#6366f1",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              내 지원 현황 보기
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {shipments.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "white",
                  border: "1px solid #e5e5e5",
                  borderRadius: 14,
                  padding: 20,
                  cursor: "pointer",
                }}
                onClick={() => router.push(`/shipments/${s.id}`)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "#111", fontSize: 16 }}>
                      📦 {s.artworkTitle || "작품"}
                    </div>
                    <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                      {s.carrierName} · {s.type === "international" ? "국제배송" : "국내배송"}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: `${SHIPMENT_STATUS_COLOR[s.status]}15`,
                      color: SHIPMENT_STATUS_COLOR[s.status],
                    }}
                  >
                    {SHIPMENT_STATUS_KO[s.status] || s.status}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "#f9f9f9",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "#888" }}>픽업:</span>
                    <span style={{ color: "#111" }}>{s.pickupAddress}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "#888" }}>배송지:</span>
                    <span style={{ color: "#111" }}>{s.deliveryAddress}</span>
                  </div>
                </div>

                {s.trackingNumber && (
                  <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#888" }}>
                      추적번호: {s.trackingNumber}
                    </span>
                    {s.trackingUrl && (
                      <a
                        href={s.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: "#6366f1",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        추적하기 →
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
