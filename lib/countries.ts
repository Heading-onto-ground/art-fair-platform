// Canonical country names (Korean) and normalization aliases
const ALIASES: Record<string, string> = {
  "대한민국": "한국", "korea": "한국", "south korea": "한국", "korea, republic of": "한국",
  "japan": "일본", "united states": "미국", "usa": "미국", "united kingdom": "영국", "uk": "영국",
  "france": "프랑스", "germany": "독일", "deutschland": "독일", "italy": "이탈리아", "italia": "이탈리아",
  "switzerland": "스위스", "schweiz": "스위스", "china": "중국", "australia": "호주",
  "canada": "캐나다", "netherlands": "네덜란드", "spain": "스페인", "belgium": "벨기에",
  "austria": "오스트리아", "sweden": "스웨덴", "norway": "노르웨이", "denmark": "덴마크",
  "singapore": "싱가포르", "hong kong": "홍콩", "taiwan": "대만", "brazil": "브라질",
  "mexico": "멕시코", "india": "인도", "russia": "러시아", "portugal": "포르투갈",
  "poland": "폴란드", "turkey": "터키", "new zealand": "뉴질랜드", "indonesia": "인도네시아",
  "thailand": "태국", "vietnam": "베트남", "malaysia": "말레이시아", "philippines": "필리핀",
};

export const COUNTRIES: string[] = [
  "한국", "일본", "중국", "미국", "영국", "프랑스", "독일", "이탈리아", "스위스", "호주",
  "캐나다", "네덜란드", "스페인", "벨기에", "오스트리아", "스웨덴", "노르웨이", "덴마크",
  "싱가포르", "홍콩", "대만", "브라질", "멕시코", "인도", "러시아", "포르투갈",
  "폴란드", "터키", "뉴질랜드", "인도네시아", "태국", "베트남", "말레이시아", "필리핀",
];

// English display names matching COUNTRIES order (for bilingual select options)
const ENGLISH_NAMES: Record<string, string> = {
  "한국": "South Korea", "일본": "Japan", "중국": "China", "미국": "United States",
  "영국": "United Kingdom", "프랑스": "France", "독일": "Germany", "이탈리아": "Italy",
  "스위스": "Switzerland", "호주": "Australia", "캐나다": "Canada", "네덜란드": "Netherlands",
  "스페인": "Spain", "벨기에": "Belgium", "오스트리아": "Austria", "스웨덴": "Sweden",
  "노르웨이": "Norway", "덴마크": "Denmark", "싱가포르": "Singapore", "홍콩": "Hong Kong",
  "대만": "Taiwan", "브라질": "Brazil", "멕시코": "Mexico", "인도": "India",
  "러시아": "Russia", "포르투갈": "Portugal", "폴란드": "Poland", "터키": "Turkey",
  "뉴질랜드": "New Zealand", "인도네시아": "Indonesia", "태국": "Thailand",
  "베트남": "Vietnam", "말레이시아": "Malaysia", "필리핀": "Philippines",
};

export function normalizeCountry(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  return ALIASES[trimmed.toLowerCase()] ?? ALIASES[trimmed] ?? trimmed;
}

/** Returns select option label: "South Korea (한국)" */
export function countryOptionLabel(canonical: string): string {
  const en = ENGLISH_NAMES[canonical];
  return en ? `${en} (${canonical})` : canonical;
}
