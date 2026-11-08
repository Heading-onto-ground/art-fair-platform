export const ROB_LOCALE_COOKIE = "rob_locale";

export type HistoryLocale = "ko" | "en";

export function resolveHistoryLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): HistoryLocale {
  if (cookie === "ko" || cookie === "en") return cookie;
  const first = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("ko") ? "ko" : "en";
}

export type HistoryCopy = {
  searchTitle: string;
  searchLead: string;
  searchLeadFull: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchButton: string;
  searching: string;
  searchEmpty: string;
  unconfirmedName: string;
  recordedMention: string;
  viewExhibition: string;
  researchOffer: string;
  researchAsk: string;
  researchAction: string;
  researchExpand: string;
  searchError: string;
  startHistory: string;
  exploreWorld: string;
  artistHistory: string;
  partialHistory: string;
  history: string;
  connections: string;
  people: string;
  places: string;
  curators: string;
  works: string;
  about: string;
  documentedInRob: string;
  gapNote: string;
  coveragePartial: string;
  source: string;
  enterHistory: string;
  back: string;
  journeys: string;
  moments: string;
  paths: string;
  spaces: string;
  exploreMoment: string;
  followPath: string;
  explore: string;
  now: string;
  homeKicker: string;
  searchResults: string;
  startWith: string;
  orWord: string;
  startOwn: string;
  startHere: string;
  artistWord: string;
  spaceWord: string;
  momentWord: string;
  seeTime: string;
  seeTimeBody: string;
  openMomentTitle: string;
  openMomentBody: string;
  crossBridge: string;
  crossBridgeBody: string;
  browseGraph: string;
  browseGraphBody: string;
  seeNow: string;
  seeNowBody: string;
  noExhibitions: string;
  continueThrough: string;
  connectsPlace: string;
  alsoRecorded: string;
  noSource: string;
  addExhibition: string;
  documentedConnections: string;
  artistsHeading: string;
  noShared: string;
  documentedPlaces: string;
  noSpaces: string;
  documentedCurators: string;
  noCurator: string;
  worksArchive: string;
  openPortfolio: string;
  noWorks: string;
  aboutRecord: string;
  aboutBody: string;
  officialWebsite: string;
  claimPage: string;
  dataReview: string;
  yearNotRecorded: string;
  exhibitionWord: string;
  connectsAria: string;
  howWorks: string;
  historySignature: string;
  skipToContent: string;
  viewingRange: (start: number, end: number) => string;
  clustered: string;
  showMore: (count: number) => string;
  sharedCount: (count: number) => string;
  placeCount: (count: number) => string;
  documentedLine: (count: number) => string;
  reviewRequired: string;
  namedInTitle: string;
  unresolvedParticipant: string;
  curatorLabel: string;
  locationNotRecorded: string;
  densityLabel: string;
  openingHistory: string;
  timelineLevel: string;
  momentConnections: string;
  timelineHelp: string;
  timelineHelpBody: string;
  yearAria: (year: number, count: number, dated: boolean) => string;
  recordsOnly: string;
  contributionNote: string;
  addMissing: string;
  claimYourself: string;
  addOwnedExhibition: string;
  manageRecord: string;
  claimPending: string;
  claimSubmitted: string;
  claimApproved: string;
  originHeading: string;
  originRob: string;
  originArtist: string;
  originGallery: string;
  originInstitution: string;
  originLegacy: string;
  startKicker: string;
  searchYourself: string;
  yourName: string;
  claimPrompt: (name: string) => string;
  claimThis: string;
  createRecord: string;
  createArtistButton: string;
  noExistingPage: string;
  existingArtist: string;
  ambiguousArtist: string;
  couldNotCreate: string;
  couldNotClaim: string;
  addKicker: string;
  addTitle: string;
  datePrecision: string;
  precisionUnknown: string;
  precisionYear: string;
  precisionMonth: string;
  precisionDay: string;
  startYear: string;
  startMonth: string;
  startDay: string;
  endYear: string;
  endMonth: string;
  endDay: string;
  spaceField: string;
  cityField: string;
  countryField: string;
  curatorField: string;
  participantsField: string;
  sourceUrlField: string;
  addExhibitionButton: string;
  savedForReview: string;
  couldNotAdd: string;
  artistNameField: string;
  nativeNameField: string;
  birthYearField: string;
  officialWebsiteField: string;
  pageTitle: string;
  pageDescription: string;
  recordsDocumented: string;
  exhibitionsDocumented: string;
  documentedYears: (range: string) => string;
  born: (year: number) => string;
};

const en: HistoryCopy = {
  searchTitle: "Search an artist.",
  searchLead: "Enter their world.",
  searchLeadFull: "Enter their world. Follow the moments that connect one artist to another.",
  searchLabel: "Search an artist",
  searchPlaceholder: "Search an artist...",
  searchButton: "Search",
  searching: "Searching…",
  searchEmpty: "No documented artist matches that name yet.",
  unconfirmedName: "This name is not yet confirmed as an artist page.",
  recordedMention: "Exhibitions where this name is recorded",
  viewExhibition: "View this exhibition",
  researchOffer: "ROB does not yet have enough documented history for this artist.",
  researchAsk: "Look for this artist's documented records?",
  researchAction: "Research this artist",
  researchExpand: "Look for more documented records",
  searchError: "Search is temporarily unavailable. Please try again.",
  startHistory: "Start your history",
  exploreWorld: "Explore the art world",
  artistHistory: "Artist history",
  partialHistory: "Partial history",
  history: "History",
  connections: "Connections",
  people: "People",
  places: "Places",
  curators: "Curators",
  works: "Works",
  about: "About",
  documentedInRob: "Documented in ROB",
  gapNote: "Years without a row are not years without activity.",
  coveragePartial: "Coverage is partial.",
  source: "Source",
  enterHistory: "Enter history",
  back: "Back",
  journeys: "Journeys",
  moments: "Moments",
  paths: "Paths",
  spaces: "Spaces",
  exploreMoment: "Explore this moment",
  followPath: "Follow a documented path",
  explore: "Explore",
  now: "Now",
  homeKicker: "Art history search & exploration",
  searchResults: "Search results",
  startWith: "Start with Lee Ufan",
  orWord: "or",
  startOwn: "Start your own history",
  startHere: "Start here",
  artistWord: "Artist",
  spaceWord: "Space",
  momentWord: "Moment",
  seeTime: "See time",
  seeTimeBody: "Read an artist through documented exhibitions instead of a flat CV.",
  openMomentTitle: "Open a moment",
  openMomentBody: "Select a year or exhibition to reveal its recorded place, source, and participants.",
  crossBridge: "Cross the bridge",
  crossBridgeBody: "Enter another artist's history through an exhibition they actually shared.",
  browseGraph: "Browse the graph as it grows.",
  browseGraphBody: "Artists, exhibitions, and spaces with documented records.",
  seeNow: "See what is happening now.",
  seeNowBody: "The present stays visible while today's events become tomorrow's history.",
  noExhibitions: "No documented exhibitions yet",
  continueThrough: "Continue through this exhibition into another artist's history.",
  connectsPlace: "This documented moment currently connects the artist to its recorded place.",
  alsoRecorded: "Also recorded",
  noSource: "No source is attached.",
  addExhibition: "Add an exhibition",
  documentedConnections: "Documented connections",
  artistsHeading: "Artists",
  noShared: "No documented shared exhibitions yet.",
  documentedPlaces: "Documented places",
  noSpaces: "No documented spaces yet.",
  documentedCurators: "Documented curators",
  noCurator: "No documented curator is attached.",
  worksArchive: "First-party archive",
  openPortfolio: "Open the existing portfolio",
  noWorks: "No first-party works are public on this page.",
  aboutRecord: "About this record",
  aboutBody: "ROB maps documented exhibitions and connections through time. It does not write a biography.",
  officialWebsite: "Official website",
  claimPage: "Claim this page",
  dataReview: "Data under review",
  yearNotRecorded: "Year not recorded",
  exhibitionWord: "Exhibition",
  connectsAria: "ROB connects artists through documented exhibition moments",
  howWorks: "How ROB works",
  historySignature: "History signature",
  skipToContent: "Skip to content",
  viewingRange: (start, end) => `viewing ${start}–${end}`,
  clustered: "clustered by decade",
  showMore: (count) => `Show ${count} more ${count === 1 ? "artist" : "artists"}`,
  sharedCount: (count) => (count === 1 ? "1 documented shared exhibition" : `${count} documented shared exhibitions`),
  placeCount: (count) => (count === 1 ? "1 documented exhibition" : `${count} documented exhibitions`),
  documentedLine: (count) => `${count} ${count === 1 ? "exhibition" : "exhibitions"} currently documented`,
  reviewRequired: "Review required",
  namedInTitle: "Named in the title",
  unresolvedParticipant: "Unresolved participant",
  curatorLabel: "Curator",
  locationNotRecorded: "Location not recorded",
  densityLabel: "Documented exhibition density",
  openingHistory: "Opening history",
  timelineLevel: "Timeline level",
  momentConnections: "Documented connections from this exhibition",
  timelineHelp: "How to read this timeline",
  timelineHelpBody: "Open circles mark year-only records. Filled circles include a month or day. A number is the count for that year. Empty stretches are missing ROB records, not missing activity.",
  yearAria: (year, count, dated) => `${year}, ${count} exhibition${count === 1 ? "" : "s"}, ${dated ? "dated" : "year only"}`,
  recordsOnly: "ROB shows confirmed records only.",
  contributionNote: "ROB distinguishes who added a record from the source supporting it.",
  addMissing: "Missing an exhibition? Add a record",
  claimYourself: "Is this you? Claim this record",
  addOwnedExhibition: "Add an exhibition record",
  manageRecord: "Manage my records",
  claimPending: "Record claim under review",
  claimSubmitted: "Claim submitted. Status: pending review.",
  claimApproved: "This record is already linked to your account.",
  originHeading: "Origin",
  originRob: "ROB researched",
  originArtist: "Artist submitted",
  originGallery: "Gallery submitted",
  originInstitution: "Institution submitted",
  originLegacy: "Legacy first-party record",
  startKicker: "Start your history",
  searchYourself: "Search yourself.",
  yourName: "Your name",
  claimPrompt: (name) => `You asked to claim ${name}. Search that name, or claim it directly if you already know the page.`,
  claimThis: "Claim this page",
  createRecord: "Create artist record",
  createArtistButton: "Create artist",
  noExistingPage: "No existing page matches. You can create the artist record.",
  existingArtist: "This name already has a record. Claim that page instead of creating another.",
  ambiguousArtist: "More than one record matches that name. Search and claim the right page.",
  couldNotCreate: "Could not create the artist.",
  couldNotClaim: "Could not submit the claim.",
  addKicker: "Add your first exhibition",
  addTitle: "Exhibition",
  datePrecision: "Date precision",
  precisionUnknown: "Unknown",
  precisionYear: "Year",
  precisionMonth: "Month",
  precisionDay: "Day",
  startYear: "Start year",
  startMonth: "Start month",
  startDay: "Start day",
  endYear: "End year",
  endMonth: "End month",
  endDay: "End day",
  spaceField: "Space",
  cityField: "City",
  countryField: "Country",
  curatorField: "Curator",
  participantsField: "Participants, one name per line",
  sourceUrlField: "Source URL",
  addExhibitionButton: "Add exhibition",
  savedForReview: "Saved for review.",
  couldNotAdd: "Could not add the exhibition.",
  artistNameField: "Artist name",
  nativeNameField: "Native name",
  birthYearField: "Birth year",
  officialWebsiteField: "Official website",
  pageTitle: "ROB — Artist History & Documented Connections",
  pageDescription: "Search artists and explore documented exhibitions, spaces, curators, and artist connections. ROB builds verified art histories from official sources.",
  recordsDocumented: "records currently documented in ROB",
  exhibitionsDocumented: "exhibitions currently documented in ROB",
  documentedYears: (range) => `Documented years ${range}`,
  born: (year) => `Born ${year}`,
};

const ko: HistoryCopy = {
  searchTitle: "작가를 검색하세요.",
  searchLead: "그 작가의 세계로 들어갑니다.",
  searchLeadFull: "그 작가의 세계로 들어갑니다. 한 작가를 다른 작가와 잇는 기록된 순간을 따라가 보세요.",
  searchLabel: "아티스트를 검색하세요",
  searchPlaceholder: "아티스트를 검색하세요",
  searchButton: "검색",
  searching: "검색 중…",
  searchEmpty: "아직 ROB에 기록된 아티스트가 없습니다.",
  unconfirmedName: "이 이름은 아직 작가 페이지로 확인되지 않았습니다.",
  recordedMention: "이 이름이 기록된 전시",
  viewExhibition: "이 전시 보기",
  researchOffer: "아직 ROB에 충분한 기록이 없습니다.",
  researchAsk: "이 작가의 기록을 찾아볼까요?",
  researchAction: "이 작가 조사하기",
  researchExpand: "기록을 더 찾아보기",
  searchError: "검색을 잠시 사용할 수 없습니다. 다시 시도해 주세요.",
  startHistory: "이력 시작하기",
  exploreWorld: "예술 세계 둘러보기",
  artistHistory: "작가 이력",
  partialHistory: "일부 기록",
  history: "이력",
  connections: "연결",
  people: "사람들",
  places: "장소",
  curators: "큐레이터",
  works: "작품",
  about: "소개",
  documentedInRob: "ROB에 기록된 이력",
  gapNote: "기록이 없는 해가 활동이 없었던 해를 의미하지는 않습니다.",
  coveragePartial: "현재 기록은 일부입니다.",
  source: "출처",
  enterHistory: "이력 보기",
  back: "뒤로",
  journeys: "여정",
  moments: "순간",
  paths: "경로",
  spaces: "공간",
  exploreMoment: "이 순간 살펴보기",
  followPath: "기록된 경로를 따라가기",
  explore: "둘러보기",
  now: "지금",
  homeKicker: "미술 이력 검색과 탐색",
  searchResults: "검색 결과",
  startWith: "Lee Ufan부터 보기",
  orWord: "또는",
  startOwn: "내 이력 시작하기",
  startHere: "여기서 시작",
  artistWord: "작가",
  spaceWord: "공간",
  momentWord: "순간",
  seeTime: "시간을 보다",
  seeTimeBody: "납작한 약력 대신, 기록된 전시로 작가를 읽습니다.",
  openMomentTitle: "순간을 열다",
  openMomentBody: "연도나 전시를 고르면 기록된 장소, 출처, 참여자가 보입니다.",
  crossBridge: "다리를 건너다",
  crossBridgeBody: "실제로 함께한 전시를 통해 다른 작가의 이력으로 들어갑니다.",
  browseGraph: "커지는 그래프를 둘러봅니다.",
  browseGraphBody: "기록이 있는 작가, 전시, 공간입니다.",
  seeNow: "지금 진행 중인 전시를 봅니다.",
  seeNowBody: "오늘의 행사는 내일의 이력이 되고, 현재는 그대로 남아 있습니다.",
  noExhibitions: "아직 기록된 전시가 없습니다",
  continueThrough: "이 전시를 통해 다른 작가의 이력으로 이어집니다.",
  connectsPlace: "이 기록된 순간은 작가를 기록된 장소와 연결합니다.",
  alsoRecorded: "함께 기록된 이름",
  noSource: "연결된 출처가 없습니다.",
  addExhibition: "전시 추가",
  documentedConnections: "기록된 연결",
  artistsHeading: "작가",
  noShared: "아직 기록된 공동 전시가 없습니다.",
  documentedPlaces: "기록된 장소",
  noSpaces: "아직 기록된 공간이 없습니다.",
  documentedCurators: "기록된 큐레이터",
  noCurator: "연결된 큐레이터가 없습니다.",
  worksArchive: "직접 제공한 아카이브",
  openPortfolio: "기존 포트폴리오 열기",
  noWorks: "이 페이지에 공개된 직접 제공 작품이 없습니다.",
  aboutRecord: "이 기록에 대하여",
  aboutBody: "ROB는 기록된 전시와 연결을 시간 위에 놓습니다. 전기를 쓰지 않습니다.",
  officialWebsite: "공식 웹사이트",
  claimPage: "이 페이지 소유 신청",
  dataReview: "검토 중인 기록",
  yearNotRecorded: "연도 미기록",
  exhibitionWord: "전시",
  connectsAria: "ROB는 기록된 전시를 통해 작가를 연결합니다",
  howWorks: "ROB가 작동하는 방식",
  historySignature: "이력 형태",
  skipToContent: "본문으로 건너뛰기",
  viewingRange: (start, end) => `${start}–${end} 보는 중`,
  clustered: "연대별로 묶음",
  showMore: (count) => `작가 ${count}명 더 보기`,
  sharedCount: (count) => `기록된 공동 전시 ${count}건`,
  placeCount: (count) => `기록된 전시 ${count}건`,
  documentedLine: (count) => `현재 ROB에 기록된 전시 ${count}건`,
  reviewRequired: "검토 필요",
  namedInTitle: "제목에만 등장",
  unresolvedParticipant: "확인되지 않은 참여자",
  curatorLabel: "큐레이터",
  locationNotRecorded: "장소가 기록되지 않았습니다",
  densityLabel: "기록된 전시 밀도",
  openingHistory: "이력 여는 중",
  timelineLevel: "시간 범위",
  momentConnections: "이 전시에서 기록된 연결",
  timelineHelp: "이 시간축을 읽는 법",
  timelineHelpBody: "빈 원은 연도만 있는 기록입니다. 채워진 원은 월이나 일이 있습니다. 숫자는 그해의 건수입니다. 비어 있는 구간은 활동이 없었다는 뜻이 아니라, ROB에 기록이 없다는 뜻입니다.",
  yearAria: (year, count, dated) => `${year}년, 전시 ${count}건, ${dated ? "날짜 있음" : "연도만"}`,
  recordsOnly: "ROB에는 확인된 기록만 표시합니다.",
  contributionNote: "ROB는 입력된 내용을 그대로 경력으로 확정하지 않습니다. 기록의 출처와 등록 주체를 구분해 표시합니다.",
  addMissing: "빠진 전시가 있나요? 기록 추가",
  claimYourself: "이 작가 본인인가요? 기록 관리 신청",
  addOwnedExhibition: "전시 기록 추가",
  manageRecord: "내 기록 관리",
  claimPending: "기록 관리 신청 검토 중",
  claimSubmitted: "신청을 받았습니다. 검토 중입니다.",
  claimApproved: "이 기록은 이미 이 계정과 연결되어 있습니다.",
  originHeading: "등록 주체",
  originRob: "ROB 조사",
  originArtist: "작가 등록",
  originGallery: "갤러리 등록",
  originInstitution: "기관 등록",
  originLegacy: "기존 기록",
  startKicker: "내 기록 시작하기",
  searchYourself: "내 작가 기록 찾기",
  yourName: "내 이름",
  claimPrompt: (name) => `${name} 기록의 관리를 신청했습니다. 이름을 검색하거나, 페이지를 알고 있으면 바로 신청하세요.`,
  claimThis: "이 기록 관리 신청",
  createRecord: "새 작가 기록 시작",
  createArtistButton: "기록 시작",
  noExistingPage: "같은 이름의 작가 페이지가 없습니다. 새 기록을 시작할 수 있습니다.",
  existingArtist: "같은 이름의 기록이 있습니다. 새로 만들지 말고 그 기록의 관리를 신청하세요.",
  ambiguousArtist: "같은 이름의 기록이 둘 이상입니다. 검색해서 맞는 기록을 신청하세요.",
  couldNotCreate: "작가 기록을 만들지 못했습니다.",
  couldNotClaim: "신청을 보내지 못했습니다.",
  addKicker: "전시 기록 추가",
  addTitle: "전시",
  datePrecision: "날짜 정밀도",
  precisionUnknown: "미상",
  precisionYear: "연",
  precisionMonth: "월",
  precisionDay: "일",
  startYear: "시작 연도",
  startMonth: "시작 월",
  startDay: "시작 일",
  endYear: "종료 연도",
  endMonth: "종료 월",
  endDay: "종료 일",
  spaceField: "공간",
  cityField: "도시",
  countryField: "국가",
  curatorField: "큐레이터",
  participantsField: "참여자, 한 줄에 한 이름",
  sourceUrlField: "출처 주소",
  addExhibitionButton: "전시 추가",
  savedForReview: "검토를 위해 저장되었습니다.",
  couldNotAdd: "전시를 추가하지 못했습니다.",
  artistNameField: "작가 이름",
  nativeNameField: "원어 이름",
  birthYearField: "출생 연도",
  officialWebsiteField: "공식 웹사이트",
  pageTitle: "ROB — 작가의 전시 이력과 기록된 연결",
  pageDescription: "작가를 검색하고 공식 출처로 확인된 전시, 공간, 큐레이터와 작가 간 연결을 따라가세요.",
  recordsDocumented: "현재 ROB에 기록된 이력",
  exhibitionsDocumented: "현재 ROB에 기록된 전시",
  documentedYears: (range) => `기록된 기간 ${range}`,
  born: (year) => `${year}년생`,
};

export function historyCopy(locale: HistoryLocale): HistoryCopy {
  return locale === "ko" ? ko : en;
}

export function historyOriginLabel(locale: HistoryLocale, origin: string): string {
  const copy = historyCopy(locale);
  if (origin === "ROB_RESEARCHED") return copy.originRob;
  if (origin === "ARTIST_SUBMITTED") return copy.originArtist;
  if (origin === "GALLERY_SUBMITTED") return copy.originGallery;
  if (origin === "INSTITUTION_SUBMITTED") return copy.originInstitution;
  if (origin === "LEGACY_FIRST_PARTY") return copy.originLegacy;
  return copy.originLegacy;
}

export function countNoun(locale: HistoryLocale, count: number, kind: "record" | "exhibition"): string {
  const copy = historyCopy(locale);
  if (locale === "ko") return kind === "record" ? copy.recordsDocumented : copy.exhibitionsDocumented;
  const word = kind === "record" ? (count === 1 ? "record" : "records") : (count === 1 ? "exhibition" : "exhibitions");
  return `${word} currently documented in ROB`;
}
