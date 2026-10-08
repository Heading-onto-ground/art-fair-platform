export type Cohort = "INTERNATIONAL" | "DOMESTIC_INSTITUTIONAL" | "EMERGING";

export type IdentityStatus = "UNREVIEWED" | "QID_CONFIRMED" | "QID_UNRESOLVED" | "QID_AMBIGUOUS";

export type SeedArtist = {
  pilotId: string;
  cohort: Cohort;
  canonicalKoreanName: string;
  romanizedNames: string[];
  otherAliases: string[];
  birthYear: number | null;
  wikidataQid: string | null;
  identityStatus: IdentityStatus;
  ambiguityNote: string | null;
  alsoInternational: boolean;
  selectionNote: string;
};

type Extra = {
  aliases?: string[];
  ambiguity?: string;
  alsoInternational?: boolean;
  note?: string;
};

type Row = [string, string, Extra?];

const INTERNATIONAL: Row[] = [
  ["이우환", "Lee Ufan", { aliases: ["Ufan Lee"] }],
  ["양혜규", "Haegue Yang"],
  ["서도호", "Do Ho Suh", { aliases: ["Suh Do Ho"] }],
  ["이불", "Lee Bul"],
  ["김수자", "Kimsooja", { aliases: ["Kim Sooja"] }],
  ["아니카 이", "Anicka Yi"],
  ["박서보", "Park Seo-Bo", { aliases: ["Park Seobo"] }],
  ["하종현", "Ha Chong-Hyun", { aliases: ["Ha Chonghyun"] }],
  ["이배", "Lee Bae", { ambiguity: "Common name. Do not merge without an authoritative identifier." }],
  ["정상화", "Chung Sang-Hwa", { aliases: ["Chung Sanghwa"] }],
  ["김범", "Kim Beom", { ambiguity: "Common name. Do not merge without an authoritative identifier." }],
  ["임민욱", "Minouk Lim"],
  ["구정아", "Koo Jeong A"],
  ["강서경", "Suki Seokyeong Kang"],
  ["이미래", "Mire Lee"],
  ["김홍석", "Gimhongsok", { aliases: ["Kim Hong-seok"] }],
  ["정은영", "siren eun young jung", { ambiguity: "Hangul form is shared. Preferred public name is siren eun young jung." }],
  ["김아영", "Ayoung Kim"],
  ["정금형", "Geumhyung Jeong"],
  ["이수경", "Yeesookyung", { ambiguity: "Hangul form is shared. Preferred public name is Yeesookyung." }],
  ["함경아", "Kyungah Ham"],
  ["임흥순", "Im Heung-soon"],
  ["박찬경", "Park Chan-kyong"],
  ["문경원", "Moon Kyungwon"],
  ["니키 리", "Nikki S. Lee", { aliases: ["Nikki Lee"] }],
];

const DOMESTIC: Row[] = [
  ["최정화", "Choi Jeong Hwa", { alsoInternational: true }],
  ["전준호", "Jeon Joonho"],
  ["정연두", "Jung Yeondoo"],
  ["배영환", "Bae Young-whan"],
  ["김소라", "Sora Kim", { ambiguity: "Common name. Do not merge without an authoritative identifier." }],
  ["노재운", "Rho Jae Oon"],
  ["이용백", "Lee Yongbaek"],
  ["안규철", "Ahn Kyuchul"],
  ["양아치", "Yangachi"],
  ["오형근", "Oh Hein-kuhn"],
  ["배병우", "Bae Bien-U"],
  ["김아타", "Atta Kim"],
  ["구본창", "Koo Bohnchang"],
  ["함진", "Ham Jin", { ambiguity: "Short name. Do not merge without an authoritative identifier." }],
  ["이이남", "Lee Lee Nam"],
  ["최수앙", "Xooang Choi"],
  ["권오상", "Gwon Osang"],
  ["신미경", "Meekyoung Shin"],
  ["이승택", "Lee Seung-taek", { alsoInternational: true }],
  ["김상돈", "Kim Sang-don"],
  ["김희천", "Kim Heecheon"],
  ["이완", "Lee Wan", { ambiguity: "Common name. Do not merge without an authoritative identifier." }],
  ["백현진", "Bek Hyunjin"],
  ["김기라", "Kim Kira"],
  ["이진주", "Lee Jinju"],
  ["권병준", "Kwon Byung-jun", { note: "Korea Artist Prize 2023." }],
  ["이강승", "Kang Seung Lee", { alsoInternational: true, note: "Korea Artist Prize 2023." }],
  ["전소정", "Jeon Sojung", { note: "Korea Artist Prize 2023." }],
  ["권하윤", "Kwon Hayoun", { note: "Korea Artist Prize 2024." }],
  ["양정욱", "Yang Jung-uk", { note: "Korea Artist Prize 2024." }],
  ["윤지영", "Yun Ji-young", { ambiguity: "Common name. This seat is the Korea Artist Prize 2024 participant only.", note: "Korea Artist Prize 2024." }],
  ["제인 진 카이젠", "Jane Jin Kaisen", { alsoInternational: true, note: "Korea Artist Prize 2024." }],
  ["김영은", "Kim Young-eun", { ambiguity: "Very common name. This seat is the Korea Artist Prize 2025 participant only.", note: "Korea Artist Prize 2025." }],
  ["임영주", "Lim Young-ju", { ambiguity: "Common name. This seat is the Korea Artist Prize 2025 participant only.", note: "Korea Artist Prize 2025." }],
  ["김지평", "Kim Ji-pyeong", { note: "Korea Artist Prize 2025." }],
  ["윤석남", "Yun Suk-nam"],
  ["김용익", "Kim Yong-ik"],
  ["이건용", "Lee Kun-yong"],
  ["문성식", "Sungsic Moon"],
  ["김성환", "Sung Hwan Kim", { ambiguity: "Common name. Do not merge without birth year or an authoritative identifier.", alsoInternational: true }],
  ["이동기", "Lee Dongi"],
  ["장지아", "Chang Jia"],
  ["김을", "Kim Eull"],
  ["조해준", "Cho Hae-jun"],
  ["이형구", "Hyungkoo Lee"],
  ["김구림", "Kim Ku-lim"],
  ["이강소", "Lee Kang-so"],
  ["김홍주", "Kim Hong-joo"],
  ["최병소", "Choi Byung-so"],
  ["이명호", "Lee Myoung-ho"],
];

const EMERGING: Row[] = [
  ["구나", "Gu Na"],
  ["구자명", "Koo Ja-myoung"],
  ["김원화", "Kim Won-hwa"],
  ["노상호", "Noh Sang-ho"],
  ["박종영", "Park Jong-young"],
  ["배윤환", "Bae Yoon-hwan"],
  ["손수민", "Shon Soo-min"],
  ["송예환", "Song Ye-hwan"],
  ["안유리", "An Yu-ri"],
  ["얄루", "Yaloo"],
  ["오묘초", "Omyo Cho"],
  ["유아연", "Ryu Ah-yeon"],
  ["이승애", "Lee Seung-ae"],
  ["이혜인", "Lee Hye-in"],
  ["조재영", "Cho Jai-young"],
  ["진민욱", "Jin Min-wook"],
  ["최장원", "Choi Jang-won"],
  ["추미림", "Chu Mi-rim"],
  ["탁영준", "Tak Young-jun"],
  ["남진우", "Nam Jin-woo"],
  ["문이삭", "Moon Isak"],
  ["박웅규", "Park Woong-kyu"],
  ["박형진", "Park Hyung-jin"],
  ["백경호", "Baek Kyung-ho"],
  ["백종관", "Baek Jong-gwan", { ambiguity: "The 23rd SongEun participation sentence and artist list say 백종관. The same page's 본선 참여 line says 백종원. This seat stays 백종관 and must not be auto-merged." }],
];

const COHORT_NOTE: Record<Cohort, string> = {
  INTERNATIONAL:
    "Cohort A. Frozen before extraction as the documentation upper bound: international museum, biennale, or global-gallery pages are expected.",
  DOMESTIC_INSTITUTIONAL:
    "Cohort B. Korean museum and prize exhibitions, roughly 2011–2026. Historical estates were not used to fill this cohort.",
  EMERGING:
    "Cohort C. Individuals from the 24th SongEun Art Award 본선 참여 line (collective 업체 eobchae removed), then winner 탁영준, then the first six names in the 23rd edition 참여작가 sentence. Frozen before extraction.",
};

function rows(cohort: Cohort, prefix: string, list: Row[]): SeedArtist[] {
  return list.map(([korean, roman, extra], index) => ({
    pilotId: `${prefix}${String(index + 1).padStart(2, "0")}`,
    cohort,
    canonicalKoreanName: korean,
    romanizedNames: [roman],
    otherAliases: extra?.aliases ?? [],
    birthYear: null,
    wikidataQid: null,
    identityStatus: "UNREVIEWED",
    ambiguityNote: extra?.ambiguity ?? null,
    alsoInternational: extra?.alsoInternational ?? false,
    selectionNote: [COHORT_NOTE[cohort], extra?.note].filter(Boolean).join(" "),
  }));
}

export const EXCLUSIONS = [
  { name: "업체 eobchae", reason: "Collective. This canary is limited to person entities." },
  { name: "언메이크랩", reason: "Collective named in Korea Artist Prize 2025. Not given a person seat." },
  { name: "윤형근", reason: "Historical estate. Outside the domestic cohort's roughly 2011–2026 practice window." },
  { name: "김창열", reason: "Historical estate. Outside the domestic cohort's roughly 2011–2026 practice window." },
  { name: "박이소", reason: "Died 2004. Not used to fill the recent institutional cohort." },
] as const;

export function buildSeedArtists(): SeedArtist[] {
  if (INTERNATIONAL.length !== 25 || DOMESTIC.length !== 50 || EMERGING.length !== 25) {
    throw new Error("Cohort sizes drifted before freeze.");
  }
  return [
    ...rows("INTERNATIONAL", "A", INTERNATIONAL),
    ...rows("DOMESTIC_INSTITUTIONAL", "B", DOMESTIC),
    ...rows("EMERGING", "C", EMERGING),
  ];
}

export function validateSeed(artists: SeedArtist[]): string[] {
  const errors: string[] = [];
  if (artists.length !== 100) errors.push(`expected 100 artists, found ${artists.length}`);
  const counts: Record<Cohort, number> = {
    INTERNATIONAL: 0,
    DOMESTIC_INSTITUTIONAL: 0,
    EMERGING: 0,
  };
  const ids = new Set<string>();
  for (const artist of artists) {
    counts[artist.cohort] += 1;
    if (ids.has(artist.pilotId)) errors.push(`duplicate ${artist.pilotId}`);
    ids.add(artist.pilotId);
    if (!artist.canonicalKoreanName) errors.push(`missing Korean name ${artist.pilotId}`);
    if (artist.romanizedNames.length === 0) errors.push(`missing romanization ${artist.pilotId}`);
    if (artist.identityStatus === "UNREVIEWED") errors.push(`unreviewed ${artist.pilotId}`);
    if (artist.wikidataQid && artist.identityStatus !== "QID_CONFIRMED") {
      errors.push(`qid without confirmation ${artist.pilotId}`);
    }
  }
  if (counts.INTERNATIONAL !== 25) errors.push("cohort A is not 25");
  if (counts.DOMESTIC_INSTITUTIONAL !== 50) errors.push("cohort B is not 50");
  if (counts.EMERGING !== 25) errors.push("cohort C is not 25");
  const banned = ["eobchae", "언메이크", "윤형근", "김창열", "박이소"];
  for (const artist of artists) {
    const blob = `${artist.canonicalKoreanName} ${artist.romanizedNames.join(" ")}`.toLowerCase();
    if (banned.some((name) => blob.includes(name.toLowerCase()))) {
      errors.push(`excluded name present: ${artist.pilotId}`);
    }
  }
  return errors;
}
