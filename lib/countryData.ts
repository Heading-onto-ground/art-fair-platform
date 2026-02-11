// Country code ↔ Korean name mapping and metadata for SEO landing pages

export type CountryInfo = {
  code: string;
  nameKo: string;
  nameEn: string;
  nameLocal: string;
  flag: string;
  continent: string;
  artScene: string;
  keyInstitutions: string[];
  seoTitle: string;
  seoDescription: string;
};

export const COUNTRIES: CountryInfo[] = [
  {
    code: "kr",
    nameKo: "한국",
    nameEn: "South Korea",
    nameLocal: "대한민국",
    flag: "🇰🇷",
    continent: "Asia",
    artScene: "Korea's contemporary art scene has grown rapidly, anchored by institutions like MMCA and events like KIAF. Seoul's galleries in Samcheong-dong, Hannam-dong, and Seongsu are hubs for emerging artists.",
    keyInstitutions: ["MMCA", "KIAF", "Leeum Museum", "Seoul Museum of Art", "Arario Gallery"],
    seoTitle: "Open Calls for Artists in South Korea | ROB",
    seoDescription: "Discover open calls from Korean galleries and institutions. Apply to exhibitions in Seoul and beyond through ROB — Role of Bridge.",
  },
  {
    code: "jp",
    nameKo: "일본",
    nameEn: "Japan",
    nameLocal: "日本",
    flag: "🇯🇵",
    continent: "Asia",
    artScene: "Japan's art ecosystem blends tradition and innovation, from Tokyo's Roppongi Hills to Naoshima's island galleries. Residency culture is strong, with programs like ARCUS and Mori Art Museum supporting international exchange.",
    keyInstitutions: ["Mori Art Museum", "21st Century Museum", "teamLab", "ARCUS", "Tokyo Opera City Gallery"],
    seoTitle: "Open Calls for Artists in Japan | ROB",
    seoDescription: "Browse open calls from Japanese galleries and art institutions. Connect with Tokyo, Osaka, and Kyoto art spaces through ROB.",
  },
  {
    code: "uk",
    nameKo: "영국",
    nameEn: "United Kingdom",
    nameLocal: "United Kingdom",
    flag: "🇬🇧",
    continent: "Europe",
    artScene: "The UK is a global art hub with London at its center. From Frieze London to the Serpentine Galleries, opportunities abound for emerging and established artists alike.",
    keyInstitutions: ["Serpentine Galleries", "Saatchi Gallery", "Tate Modern", "Whitechapel Gallery", "Frieze London"],
    seoTitle: "Open Calls for Artists in the UK | ROB",
    seoDescription: "Find open calls from UK galleries and museums. Apply to exhibitions in London and across Britain through ROB — Role of Bridge.",
  },
  {
    code: "fr",
    nameKo: "프랑스",
    nameEn: "France",
    nameLocal: "France",
    flag: "🇫🇷",
    continent: "Europe",
    artScene: "France remains the cultural capital of Europe. Paris houses Palais de Tokyo, Centre Pompidou, and countless independent galleries in Le Marais. Public funding for art is exceptionally strong.",
    keyInstitutions: ["Palais de Tokyo", "Centre Pompidou", "Cité des Arts", "Villa Arson", "Fondation Cartier"],
    seoTitle: "Open Calls for Artists in France | ROB",
    seoDescription: "Explore open calls from French galleries, museums, and residencies. Connect with Paris art spaces through ROB.",
  },
  {
    code: "us",
    nameKo: "미국",
    nameEn: "United States",
    nameLocal: "United States",
    flag: "🇺🇸",
    continent: "North America",
    artScene: "The US art market is the largest in the world, centered around New York's Chelsea, LA's Arts District, and Miami's Wynwood. MoMA PS1, Whitney, and countless galleries offer open calls year-round.",
    keyInstitutions: ["MoMA PS1", "Whitney Museum", "New Museum", "LACMA", "Art Basel Miami"],
    seoTitle: "Open Calls for Artists in the USA | ROB",
    seoDescription: "Discover open calls from American galleries and institutions. Apply to exhibitions across the United States through ROB.",
  },
  {
    code: "de",
    nameKo: "독일",
    nameEn: "Germany",
    nameLocal: "Deutschland",
    flag: "🇩🇪",
    continent: "Europe",
    artScene: "Germany's art scene is decentralized and vibrant. Berlin's Kreuzberg and Mitte host hundreds of galleries, while documenta in Kassel is one of the world's most important recurring art events.",
    keyInstitutions: ["documenta", "Haus der Kunst", "Hamburger Bahnhof", "KW Institute", "Kunstverein network"],
    seoTitle: "Open Calls for Artists in Germany | ROB",
    seoDescription: "Browse open calls from German galleries, Kunstvereins, and institutions. Connect with Berlin's art scene through ROB.",
  },
  {
    code: "it",
    nameKo: "이탈리아",
    nameEn: "Italy",
    nameLocal: "Italia",
    flag: "🇮🇹",
    continent: "Europe",
    artScene: "Italy's art heritage is unmatched, and its contemporary scene thrives through the Venice Biennale — the world's most prestigious art exhibition. Milan and Rome also host vibrant gallery scenes.",
    keyInstitutions: ["Venice Biennale", "Fondazione Prada", "MAXXI", "Palazzo Grassi", "Triennale Milano"],
    seoTitle: "Open Calls for Artists in Italy | ROB",
    seoDescription: "Find open calls from Italian galleries and the Venice Biennale. Apply to exhibitions in Italy through ROB — Role of Bridge.",
  },
  {
    code: "ch",
    nameKo: "스위스",
    nameEn: "Switzerland",
    nameLocal: "Schweiz",
    flag: "🇨🇭",
    continent: "Europe",
    artScene: "Switzerland punches above its weight in the art world, home to Art Basel — the world's premier art fair. Zurich and Geneva host world-class galleries and collectors.",
    keyInstitutions: ["Art Basel", "Kunsthaus Zürich", "Fondation Beyeler", "LUMA Westbau", "Kunsthalle Basel"],
    seoTitle: "Open Calls for Artists in Switzerland | ROB",
    seoDescription: "Discover open calls from Swiss galleries and Art Basel. Connect with Switzerland's art market through ROB.",
  },
  {
    code: "cn",
    nameKo: "중국",
    nameEn: "China",
    nameLocal: "中国",
    flag: "🇨🇳",
    continent: "Asia",
    artScene: "China's contemporary art market has exploded in recent decades. Beijing's 798 Art District and Shanghai's West Bund are epicenters, while UCCA and Power Station of Art lead institutional innovation.",
    keyInstitutions: ["UCCA", "Power Station of Art", "Long Museum", "M+ Hong Kong", "798 Art Zone"],
    seoTitle: "Open Calls for Artists in China | ROB",
    seoDescription: "Browse open calls from Chinese galleries and art institutions. Connect with Beijing and Shanghai art scenes through ROB.",
  },
  {
    code: "au",
    nameKo: "호주",
    nameEn: "Australia",
    nameLocal: "Australia",
    flag: "🇦🇺",
    continent: "Oceania",
    artScene: "Australia's art scene bridges Asia-Pacific perspectives with Western contemporary art. Melbourne and Sydney are creative capitals, with ACCA and MCA leading the way.",
    keyInstitutions: ["ACCA", "MCA Sydney", "NGV", "Art Gallery of NSW", "Adelaide Biennial"],
    seoTitle: "Open Calls for Artists in Australia | ROB",
    seoDescription: "Find open calls from Australian galleries and institutions. Apply to exhibitions in Melbourne and Sydney through ROB.",
  },
];

export function getCountryByCode(code: string): CountryInfo | null {
  return COUNTRIES.find((c) => c.code === code.toLowerCase()) ?? null;
}

export function getCountryByKoName(name: string): CountryInfo | null {
  return COUNTRIES.find((c) => c.nameKo === name) ?? null;
}

export function getCountryCodeFromKoName(name: string): string | null {
  return COUNTRIES.find((c) => c.nameKo === name)?.code ?? null;
}

export function getKoNameFromCode(code: string): string | null {
  return COUNTRIES.find((c) => c.code === code.toLowerCase())?.nameKo ?? null;
}
