"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { SHIPMENT_STATUS_KO, SHIPMENT_STATUS_COLOR } from "@/lib/carriers";

type ShipmentEvent = {
  id: string;
  status: string;
  location?: string;
  description: string;
  createdAt: string;
};

type Shipment = {
  id: string;
  applicationId: string;
  type: string;
  carrier: string;
  carrierName: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  pickupDate?: string;
  pickupTime?: string;
  pickupAddress: string;
  pickupContact: string;
  pickupNote?: string;
  deliveryAddress: string;
  deliveryContact: string;
  artworkTitle?: string;
  artworkSize?: string;
  artworkWeight?: string;
  packageCount: number;
  insured: boolean;
  insuranceValue?: number;
  estimatedCost?: number;
  createdAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  events: ShipmentEvent[];
  application: {
    openCallId: string;
    artistId: string;
    galleryId: string;
  };
};

const STATUS_ORDER = [
  "pending",
  "scheduled",
  "pickup_requested",
  "picked_up",
  "in_transit",
  "customs",
  "out_for_delivery",
  "delivered",
];

export default function ShipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/shipments/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setShipment(data.shipment);
      setTrackingNumber(data.shipment?.trackingNumber || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    if (!shipment) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await load();
    } finally {
      setUpdating(false);
    }
  };

  const updateTrackingNumber = async () => {
    if (!shipment || !trackingNumber.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: trackingNumber.trim() }),
      });
      if (res.ok) await load();
    } finally {
      setUpdating(false);
    }
  };

  const cancelShipment = async () => {
    if (!confirm("배송 예약을 취소하시겠습니까?")) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/shipments/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/shipments");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={{ padding: 40, textAlign: "center", color: "#888" }}>
          Loading...
        </main>
      </>
    );
  }

  if (error || !shipment) {
    return (
      <>
        <TopBar />
        <main style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>
          {error || "배송을 찾을 수 없습니다."}
        </main>
      </>
    );
  }

  const currentStatusIndex = STATUS_ORDER.indexOf(shipment.status);

  return (
    <>
      <TopBar />
      <main style={{ padding: "28px 24px", maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>
              📦 {shipment.artworkTitle || "배송 상세"}
            </h1>
            <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
              {shipment.carrierName} · {shipment.type === "international" ? "국제배송" : "국내배송"}
            </p>
          </div>
          <span
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              background: `${SHIPMENT_STATUS_COLOR[shipment.status]}15`,
              color: SHIPMENT_STATUS_COLOR[shipment.status],
              height: "fit-content",
            }}
          >
            {SHIPMENT_STATUS_KO[shipment.status] || shipment.status}
          </span>
        </div>

        {/* Progress Bar */}
        <Card title="배송 진행 상황">
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {STATUS_ORDER.slice(0, -1).map((status, idx) => {
              const isComplete = idx < currentStatusIndex;
              const isCurrent = status === shipment.status;
              return (
                <div
                  key={status}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: isComplete || isCurrent ? "#6366f1" : "#e5e5e5",
                    opacity: isCurrent ? 1 : isComplete ? 0.6 : 0.3,
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888" }}>
            <span>예약</span>
            <span>픽업</span>
            <span>배송중</span>
            <span>완료</span>
          </div>
        </Card>

        {/* Tracking Number */}
        <Card title="추적 번호" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="추적 번호 입력"
              style={{ flex: 1 }}
            />
            <button
              onClick={updateTrackingNumber}
              disabled={updating || !trackingNumber.trim()}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#6366f1",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              저장
            </button>
          </div>
          {shipment.trackingUrl && (
            <a
              href={shipment.trackingUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 12,
                padding: "10px 16px",
                borderRadius: 8,
                background: "#10b981",
                color: "white",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              🔍 배송 추적하기 →
            </a>
          )}
        </Card>

        {/* 상태 업데이트 버튼 */}
        <Card title="상태 업데이트" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["picked_up", "in_transit", "out_for_delivery", "delivered"].map((status) => (
              <button
                key={status}
                onClick={() => updateStatus(status)}
                disabled={updating || shipment.status === status}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: shipment.status === status ? "1px solid #6366f1" : "1px solid #e5e5e5",
                  background: shipment.status === status ? "rgba(99,102,241,0.1)" : "white",
                  color: shipment.status === status ? "#6366f1" : "#666",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: shipment.status === status ? "default" : "pointer",
                }}
              >
                {SHIPMENT_STATUS_KO[status]}
              </button>
            ))}
          </div>
        </Card>

        {/* 배송 정보 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <Card title="📍 픽업 정보">
            <InfoRow label="주소" value={shipment.pickupAddress} />
            <InfoRow label="연락처" value={shipment.pickupContact} />
            {shipment.pickupDate && (
              <InfoRow label="날짜" value={new Date(shipment.pickupDate).toLocaleDateString()} />
            )}
            {shipment.pickupTime && <InfoRow label="시간" value={shipment.pickupTime} />}
            {shipment.pickupNote && <InfoRow label="참고" value={shipment.pickupNote} />}
          </Card>

          <Card title="🏛️ 배송지 정보">
            <InfoRow label="주소" value={shipment.deliveryAddress} />
            <InfoRow label="연락처" value={shipment.deliveryContact} />
          </Card>
        </div>

        {/* 작품 정보 */}
        <Card title="🖼️ 작품 정보" style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <InfoRow label="작품명" value={shipment.artworkTitle || "-"} />
            <InfoRow label="크기" value={shipment.artworkSize || "-"} />
            <InfoRow label="무게" value={shipment.artworkWeight ? `${shipment.artworkWeight}kg` : "-"} />
            <InfoRow label="박스" value={`${shipment.packageCount}개`} />
          </div>
          {shipment.insured && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#fef3c7", borderRadius: 6, fontSize: 13 }}>
              ✅ 보험 가입됨 {shipment.insuranceValue && `(USD ${shipment.insuranceValue})`}
            </div>
          )}
        </Card>

        {/* 이벤트 히스토리 */}
        <Card title="📋 배송 기록" style={{ marginTop: 16 }}>
          {shipment.events.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>아직 기록이 없습니다.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {shipment.events.map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px",
                    background: "#f9f9f9",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: SHIPMENT_STATUS_COLOR[event.status] || "#888",
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#111", fontSize: 14 }}>
                      {event.description}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                      {new Date(event.createdAt).toLocaleString()}
                      {event.location && ` · ${event.location}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 하단 버튼 */}
        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push("/shipments")}
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              border: "1px solid #e5e5e5",
              background: "white",
              color: "#666",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← 목록으로
          </button>
          {!["picked_up", "in_transit", "delivered"].includes(shipment.status) && (
            <button
              onClick={cancelShipment}
              disabled={updating}
              style={{
                padding: "12px 20px",
                borderRadius: 8,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#dc2626",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              예약 취소
            </button>
          )}
        </div>
      </main>
    </>
  );
}

function Card({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e5e5",
        borderRadius: 14,
        padding: 20,
        ...style,
      }}
    >
      <div style={{ fontWeight: 700, color: "#111", marginBottom: 14, fontSize: 15 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
      <div style={{ fontSize: 14, color: "#111", marginTop: 2 }}>{value}</div>
    </div>
  );
}
