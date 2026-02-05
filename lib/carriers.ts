// 배송 업체 정보

export type CarrierType = "global" | "local";

export type Carrier = {
  code: string;
  name: string;
  nameKo: string;
  type: CarrierType;
  countries: string[]; // 지원 국가 (ISO 코드 또는 한글)
  trackingUrl: string; // {tracking} 을 추적번호로 치환
  phone?: string;
  features: string[];
  estimatedDays: {
    local: string;
    international: string;
  };
};

// ========== 글로벌 배송 업체 ==========

export const GLOBAL_CARRIERS: Carrier[] = [
  {
    code: "dhl",
    name: "DHL Express",
    nameKo: "DHL 익스프레스",
    type: "global",
    countries: ["ALL"],
    trackingUrl: "https://www.dhl.com/en/express/tracking.html?AWB={tracking}",
    phone: "1588-0001",
    features: ["미술품 전문 포장", "온도/습도 관리", "실시간 추적", "보험"],
    estimatedDays: { local: "1-2일", international: "3-7일" },
  },
  {
    code: "fedex",
    name: "FedEx",
    nameKo: "페덱스",
    type: "global",
    countries: ["ALL"],
    trackingUrl: "https://www.fedex.com/fedextrack/?trknbr={tracking}",
    phone: "080-023-8000",
    features: ["미술품 특별 취급", "24시간 추적", "통관 대행", "보험"],
    estimatedDays: { local: "1-2일", international: "2-5일" },
  },
  {
    code: "ups",
    name: "UPS",
    nameKo: "UPS",
    type: "global",
    countries: ["ALL"],
    trackingUrl: "https://www.ups.com/track?tracknum={tracking}",
    phone: "1588-6886",
    features: ["미술품 포장 서비스", "GPS 추적", "통관 지원", "보험"],
    estimatedDays: { local: "1-2일", international: "3-6일" },
  },
];

// ========== 한국 로컬 배송 업체 ==========

export const KOREA_CARRIERS: Carrier[] = [
  {
    code: "cj",
    name: "CJ Logistics",
    nameKo: "CJ대한통운",
    type: "local",
    countries: ["한국", "KR"],
    trackingUrl: "https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo={tracking}",
    phone: "1588-1255",
    features: ["미술품 전문배송", "당일배송", "실시간 추적", "안심포장"],
    estimatedDays: { local: "1-2일", international: "-" },
  },
  {
    code: "hanjin",
    name: "Hanjin",
    nameKo: "한진택배",
    type: "local",
    countries: ["한국", "KR"],
    trackingUrl: "https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession-ope&wblnumText2={tracking}",
    phone: "1588-0011",
    features: ["미술품 취급", "익일배송", "SMS 알림"],
    estimatedDays: { local: "1-2일", international: "-" },
  },
  {
    code: "lotte",
    name: "Lotte Global Logistics",
    nameKo: "롯데택배",
    type: "local",
    countries: ["한국", "KR"],
    trackingUrl: "https://www.lotteglogis.com/home/reservation/tracking/index?InvNo={tracking}",
    phone: "1588-2121",
    features: ["신선/미술품 특송", "익일배송", "실시간 추적"],
    estimatedDays: { local: "1-2일", international: "-" },
  },
];

// ========== 일본 로컬 배송 업체 ==========

export const JAPAN_CARRIERS: Carrier[] = [
  {
    code: "yamato",
    name: "Yamato Transport",
    nameKo: "야마토 운수 (クロネコヤマト)",
    type: "local",
    countries: ["일본", "JP"],
    trackingUrl: "https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number={tracking}",
    phone: "+81-120-01-9625",
    features: ["미술품 전문", "시간지정 배송", "실시간 추적", "보험"],
    estimatedDays: { local: "1-2일", international: "-" },
  },
  {
    code: "sagawa",
    name: "Sagawa Express",
    nameKo: "사가와 익스프레스",
    type: "local",
    countries: ["일본", "JP"],
    trackingUrl: "https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo={tracking}",
    phone: "+81-120-18-9595",
    features: ["미술품 취급", "익일배송", "추적 서비스"],
    estimatedDays: { local: "1-2일", international: "-" },
  },
];

// ========== 영국 로컬 배송 업체 ==========

export const UK_CARRIERS: Carrier[] = [
  {
    code: "royalmail",
    name: "Royal Mail",
    nameKo: "로열 메일",
    type: "local",
    countries: ["영국", "UK", "GB"],
    trackingUrl: "https://www.royalmail.com/track-your-item#/tracking/{tracking}",
    phone: "+44-345-774-0740",
    features: ["Special Delivery", "Signed For", "추적 서비스"],
    estimatedDays: { local: "1-3일", international: "-" },
  },
  {
    code: "dpd",
    name: "DPD UK",
    nameKo: "DPD",
    type: "local",
    countries: ["영국", "UK", "GB"],
    trackingUrl: "https://www.dpd.co.uk/tracking/trackingSearch.do?search.searchType=0&search.parcelNumber={tracking}",
    phone: "+44-121-275-0500",
    features: ["1시간 배송 알림", "실시간 추적", "유연한 배송"],
    estimatedDays: { local: "1-2일", international: "-" },
  },
];

// ========== 미술품 전문 배송 업체 ==========

export const ART_SPECIALIST_CARRIERS: Carrier[] = [
  {
    code: "cadogan",
    name: "Cadogan Tate",
    nameKo: "카도간 테이트",
    type: "global",
    countries: ["ALL"],
    trackingUrl: "https://www.cadogantate.com/track/{tracking}",
    phone: "+44-20-8963-6800",
    features: ["미술품 전문", "클라이밋 컨트롤", "백색장갑 서비스", "전시 설치"],
    estimatedDays: { local: "협의", international: "협의" },
  },
  {
    code: "atelier4",
    name: "Atelier 4",
    nameKo: "아뜰리에 4",
    type: "global",
    countries: ["ALL"],
    trackingUrl: "https://atelier4.com/tracking/{tracking}",
    features: ["미술품 전문", "맞춤 크레이팅", "설치 서비스", "보관"],
    estimatedDays: { local: "협의", international: "협의" },
  },
];

// ========== 헬퍼 함수들 ==========

/** 모든 배송 업체 */
export const ALL_CARRIERS: Carrier[] = [
  ...GLOBAL_CARRIERS,
  ...KOREA_CARRIERS,
  ...JAPAN_CARRIERS,
  ...UK_CARRIERS,
  ...ART_SPECIALIST_CARRIERS,
];

/** 국가별 사용 가능한 배송 업체 조회 */
export function getCarriersByCountry(country: string): Carrier[] {
  const normalized = country.trim();
  
  // 글로벌 업체는 항상 포함
  const global = GLOBAL_CARRIERS;
  
  // 로컬 업체 찾기
  let local: Carrier[] = [];
  
  if (["한국", "KR", "Korea", "South Korea"].includes(normalized)) {
    local = KOREA_CARRIERS;
  } else if (["일본", "JP", "Japan"].includes(normalized)) {
    local = JAPAN_CARRIERS;
  } else if (["영국", "UK", "GB", "United Kingdom", "Britain"].includes(normalized)) {
    local = UK_CARRIERS;
  }
  
  return [...local, ...global, ...ART_SPECIALIST_CARRIERS];
}

/** 배송 업체 코드로 조회 */
export function getCarrierByCode(code: string): Carrier | undefined {
  return ALL_CARRIERS.find((c) => c.code === code);
}

/** 추적 URL 생성 */
export function getTrackingUrl(carrierCode: string, trackingNumber: string): string | null {
  const carrier = getCarrierByCode(carrierCode);
  if (!carrier || !trackingNumber) return null;
  return carrier.trackingUrl.replace("{tracking}", trackingNumber);
}

/** 배송 상태 한글 */
export const SHIPMENT_STATUS_KO: Record<string, string> = {
  pending: "배송 예약 전",
  scheduled: "픽업 예약됨",
  pickup_requested: "픽업 요청됨",
  picked_up: "픽업 완료",
  in_transit: "배송 중",
  customs: "통관 중",
  out_for_delivery: "배송 출발",
  delivered: "배송 완료",
  returned: "반송됨",
};

/** 배송 상태 색상 */
export const SHIPMENT_STATUS_COLOR: Record<string, string> = {
  pending: "#888",
  scheduled: "#6366f1",
  pickup_requested: "#f59e0b",
  picked_up: "#6366f1",
  in_transit: "#3b82f6",
  customs: "#f59e0b",
  out_for_delivery: "#10b981",
  delivered: "#10b981",
  returned: "#ef4444",
};
