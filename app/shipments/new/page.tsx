"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import type { Carrier } from "@/lib/carriers";

export default function NewShipmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");

  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [carrier, setCarrier] = useState("");
  const [type, setType] = useState<"local" | "international">("local");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupContact, setPickupContact] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryContact, setDeliveryContact] = useState("");
  const [artworkTitle, setArtworkTitle] = useState("");
  const [artworkSize, setArtworkSize] = useState("");
  const [artworkWeight, setArtworkWeight] = useState("");
  const [packageCount, setPackageCount] = useState("1");
  const [insured, setInsured] = useState(false);
  const [insuranceValue, setInsuranceValue] = useState("");

  // 사용자 국가 기반 배송업체 로드
  useEffect(() => {
    async function loadCarriers() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meRes.json();
        const country = meData?.profile?.country || "한국";

        const res = await fetch(`/api/carriers?country=${encodeURIComponent(country)}`);
        const data = await res.json();
        setCarriers(data.carriers || []);
      } catch (e) {
        console.error("Failed to load carriers:", e);
      }
    }
    loadCarriers();
  }, []);

  const onSubmit = async () => {
    setError(null);

    if (!applicationId) {
      setError("applicationId가 필요합니다.");
      return;
    }
    if (!carrier || !pickupAddress || !pickupContact || !deliveryAddress || !deliveryContact) {
      setError("필수 정보를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          carrier,
          type,
          pickupDate: pickupDate || undefined,
          pickupTime: pickupTime || undefined,
          pickupAddress,
          pickupContact,
          pickupNote: pickupNote || undefined,
          deliveryAddress,
          deliveryContact,
          artworkTitle: artworkTitle || undefined,
          artworkSize: artworkSize || undefined,
          artworkWeight: artworkWeight || undefined,
          packageCount: parseInt(packageCount) || 1,
          insured,
          insuranceValue: insured && insuranceValue ? parseFloat(insuranceValue) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "예약 실패");
        return;
      }

      router.push(`/shipments/${data.shipment.id}`);
    } catch (e) {
      setError("서버 오류");
    } finally {
      setLoading(false);
    }
  };

  const selectedCarrier = carriers.find((c) => c.code === carrier);

  return (
    <>
      <TopBar />
      <main style={{ padding: "28px 24px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>
            배송 예약
          </h1>
          <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
            작품 배송을 예약하세요
          </p>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: 14,
            padding: 24,
          }}
        >
          {/* 배송 타입 */}
          <Section title="배송 타입">
            <div style={{ display: "flex", gap: 8 }}>
              <TypeButton
                active={type === "local"}
                onClick={() => setType("local")}
              >
                🏠 국내 배송
              </TypeButton>
              <TypeButton
                active={type === "international"}
                onClick={() => setType("international")}
              >
                🌍 국제 배송
              </TypeButton>
            </div>
          </Section>

          {/* 배송 업체 선택 */}
          <Section title="배송 업체">
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">배송 업체를 선택하세요</option>
              <optgroup label="로컬 배송">
                {carriers
                  .filter((c) => c.type === "local")
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameKo} ({c.name})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="글로벌 배송">
                {carriers
                  .filter((c) => c.type === "global")
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameKo} ({c.name})
                    </option>
                  ))}
              </optgroup>
            </select>

            {selectedCarrier && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "#f9f9f9",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, color: "#111", marginBottom: 6 }}>
                  {selectedCarrier.nameKo}
                </div>
                <div style={{ color: "#666", marginBottom: 4 }}>
                  예상 소요: {type === "international" ? selectedCarrier.estimatedDays.international : selectedCarrier.estimatedDays.local}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selectedCarrier.features.map((f) => (
                    <span
                      key={f}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "#e5e5e5",
                        fontSize: 11,
                        color: "#555",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* 픽업 정보 */}
          <Section title="픽업 정보">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="픽업 날짜">
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </Field>
              <Field label="픽업 시간대">
                <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}>
                  <option value="">선택</option>
                  <option value="09:00-12:00">오전 (09:00-12:00)</option>
                  <option value="12:00-15:00">오후1 (12:00-15:00)</option>
                  <option value="15:00-18:00">오후2 (15:00-18:00)</option>
                  <option value="18:00-21:00">저녁 (18:00-21:00)</option>
                </select>
              </Field>
            </div>
            <Field label="픽업 주소 *">
              <input
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="서울시 강남구 ..."
              />
            </Field>
            <Field label="픽업 연락처 *">
              <input
                value={pickupContact}
                onChange={(e) => setPickupContact(e.target.value)}
                placeholder="010-1234-5678"
              />
            </Field>
            <Field label="픽업 시 참고사항">
              <textarea
                value={pickupNote}
                onChange={(e) => setPickupNote(e.target.value)}
                placeholder="작품이 큽니다, 엘리베이터 없음 등"
                rows={2}
                style={{ resize: "vertical" }}
              />
            </Field>
          </Section>

          {/* 배송지 정보 */}
          <Section title="배송지 정보 (갤러리)">
            <Field label="배송 주소 *">
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="갤러리 주소"
              />
            </Field>
            <Field label="배송지 연락처 *">
              <input
                value={deliveryContact}
                onChange={(e) => setDeliveryContact(e.target.value)}
                placeholder="갤러리 연락처"
              />
            </Field>
          </Section>

          {/* 작품 정보 */}
          <Section title="작품 정보">
            <Field label="작품명">
              <input
                value={artworkTitle}
                onChange={(e) => setArtworkTitle(e.target.value)}
                placeholder="Untitled #1"
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="크기 (cm)">
                <input
                  value={artworkSize}
                  onChange={(e) => setArtworkSize(e.target.value)}
                  placeholder="100x80x5"
                />
              </Field>
              <Field label="무게 (kg)">
                <input
                  value={artworkWeight}
                  onChange={(e) => setArtworkWeight(e.target.value)}
                  placeholder="5"
                />
              </Field>
              <Field label="박스 수">
                <input
                  type="number"
                  value={packageCount}
                  onChange={(e) => setPackageCount(e.target.value)}
                  min={1}
                />
              </Field>
            </div>
          </Section>

          {/* 보험 */}
          <Section title="보험">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={insured}
                onChange={(e) => setInsured(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 14, color: "#111" }}>작품 보험 가입</span>
            </label>
            {insured && (
              <Field label="보험 금액 (USD)" style={{ marginTop: 12 }}>
                <input
                  type="number"
                  value={insuranceValue}
                  onChange={(e) => setInsuranceValue(e.target.value)}
                  placeholder="1000"
                />
              </Field>
            )}
          </Section>

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <button
              onClick={onSubmit}
              disabled={loading}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: 10,
                border: "none",
                background: loading ? "#ccc" : "#6366f1",
                color: "white",
                fontWeight: 700,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "예약 중..." : "배송 예약하기"}
            </button>
            <button
              onClick={() => router.back()}
              style={{
                padding: "14px 20px",
                borderRadius: 10,
                border: "1px solid #e5e5e5",
                background: "white",
                color: "#666",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              취소
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 700, color: "#111", marginBottom: 12, fontSize: 15 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "12px 16px",
        borderRadius: 8,
        border: active ? "1px solid #6366f1" : "1px solid #e5e5e5",
        background: active ? "rgba(99,102,241,0.1)" : "white",
        color: active ? "#6366f1" : "#666",
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
