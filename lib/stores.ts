export type OpenCall = {
  id: string;
  galleryId: string;
  gallery: string;
  city: string;
  country: string;
  theme: string;
};

let openCalls: OpenCall[] = [
  {
    id: "tate",
    galleryId: "tate", // ⭐ 필수
    gallery: "Tate Modern",
    city: "London",
    country: "UK",
    theme: "Contemporary Painting",
  },
];

export function getOpenCalls() {
  return openCalls;
}

export function addOpenCall(call: OpenCall) {
  openCalls = [call, ...openCalls];
}

