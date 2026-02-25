"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import RecommendationBanner from "@/app/components/RecommendationBanner";
import { CardSkeleton } from "@/app/components/Skeleton";
import OpenCallPoster from "@/app/components/OpenCallPoster";
import { useFetch } from "@/lib/useFetch";
import { useLanguage } from "@/lib/useLanguage";
import { useAutoLocale } from "@/lib/useAutoLocale";
import { t } from "@/lib/translate";
import { F, S } from "@/lib/design";

type OpenCall = {
  id: string; galleryId: string; gallery: string; city: string; country: string;
  theme: string; exhibitionDate?: string; deadline: string; posterImage?: string | null;
  isExternal?: boolean; externalUrl?: string;
  galleryWebsite?: string; galleryDescription?: string;
};
type Gallery = {
  userId: string;
  name: string;
  email: string;
  country: string;
  city: string;
  profileImage?: string | null;
  foundedYear?: number;
};
type Role = "artist" | "gallery";
type MeResponse = { session: { userId: string; role: Role; email?: string } | null; profile: any | null };

function hostFromUrl(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeCountry(input: string): string {
  const v = String(input || "").trim();
  if (!v) return v;
  const compact = v.replace(/\s+/g, "").toLowerCase();
  if (compact === "대한민국" || compact === "한국" || compact === "southkorea" || compact === "republicofkorea") {
    return "한국";
  }
  return v;
}

function continentFromCountry(countryInput: string): string {
  const country = normalizeCountry(countryInput);
  const asia = new Set(["한국", "일본", "중국"]);
  const europe = new Set(["영국", "프랑스", "독일", "이탈리아", "스위스"]);
  const northAmerica = new Set(["미국", "캐나다", "멕시코"]);
  const southAmerica = new Set(["브라질", "아르헨티나", "칠레", "콜롬비아", "페루"]);
  const africa = new Set(["남아프리카공화국", "나이지리아", "케냐", "모로코", "이집트", "가나", "세네갈"]);
  const oceania = new Set(["호주", "뉴질랜드"]);
  const middleEast = new Set(["아랍에미리트", "사우디아라비아", "카타르", "이스라엘", "터키"]);

  if (asia.has(country)) return "ASIA";
  if (europe.has(country)) return "EUROPE";
  if (northAmerica.has(country)) return "NORTH_AMERICA";
  if (southAmerica.has(country)) return "SOUTH_AMERICA";
  if (africa.has(country)) return "AFRICA";
  if (oceania.has(country)) return "OCEANIA";
  if (middleEast.has(country)) return "MIDDLE_EAST";
  return "OTHER";
}

function localizeContinentLabel(continent: string, lang: string): string {
  if (continent === "ALL") return "ALL";
  const ko: Record<string, string> = {
    ASIA: "아시아",
    EUROPE: "유럽",
    NORTH_AMERICA: "북미",
    SOUTH_AMERICA: "남미",
    AFRICA: "아프리카",
    OCEANIA: "오세아니아",
    MIDDLE_EAST: "중동",
    OTHER: "기타",
  };
  const ja: Record<string, string> = {
    ASIA: "アジア",
    EUROPE: "ヨーロッパ",
    NORTH_AMERICA: "北米",
    SOUTH_AMERICA: "南米",
    AFRICA: "アフリカ",
    OCEANIA: "オセアニア",
    MIDDLE_EAST: "中東",
    OTHER: "その他",
  };
  if (lang === "ko") return ko[continent] || continent;
  if (lang === "ja") return ja[continent] || continent;
  return continent.replace(/_/g, " ");
}

function normalizeCityKey(input: string): string {
  return String(input || "").trim().toLowerCase();
}

function normalizeDirectoryCity(countryInput: string, cityInput: string): string {
  const country = normalizeCountry(countryInput);
  const city = String(cityInput || "").trim();
  if (!city) return "";

  const lower = city.toLowerCase();
  const alias: Record<string, string> = {
    seould: "Seoul",
    "new york city": "New York",
    manhattan: "New York",
    brooklyn: "New York",
    queens: "New York",
    bronx: "New York",
    "los angeles county": "Los Angeles",
    "city of los angeles": "Los Angeles",
    "city of seoul": "Seoul",
    "city of london": "London",
    "royal borough of kensington and chelsea": "London",
    "london borough of southwark": "London",
    "london borough of richmond upon thames": "London",
    "london borough of wandsworth": "London",
    "8th arrondissement of paris": "Paris",
    "7th arrondissement of paris": "Paris",
    "6th arrondissement of paris": "Paris",
    "3rd arrondissement of paris": "Paris",
    "1st arrondissement of paris": "Paris",
    "18th arrondissement of paris": "Paris",
    "14th arrondissement of paris": "Paris",
    "11th arrondissement of paris": "Paris",
    "10th arrondissement of paris": "Paris",
    shinjuku: "Tokyo",
    roppongi: "Tokyo",
    "minami-aoyama": "Tokyo",
    ginza: "Tokyo",
    "sakyō-ku": "Kyoto",
    "nakagyō ward": "Kyoto",
    "roma capitale": "Rome",
    victoria: "Melbourne",
    southbank: "Melbourne",
  };
  if (alias[lower]) return alias[lower];

  if (country === "중국") {
    const chinaMajor = [
      "shanghai",
      "beijing",
      "guangzhou",
      "shenzhen",
      "chengdu",
      "hangzhou",
      "nanjing",
      "wuhan",
      "chongqing",
      "tianjin",
      "xi'an",
      "xian",
      "suzhou",
      "qingdao",
      "xiamen",
    ];
    const hit = chinaMajor.find((c) => lower === c || lower.startsWith(`${c} `));
    if (hit === "xian" || hit === "xi'an") return "Xi'an";
    if (hit) return hit.charAt(0).toUpperCase() + hit.slice(1);
    return "";
  }

  if (/\b(county|borough|arrondissement|municipality|ward|territory|province|state|capitale)\b/i.test(lower)) {
    return "";
  }
  return city;
}

function localizeCityLabel(city: string, lang: string): string {
  const key = normalizeCityKey(city);
  if (!key) return city;

  const koMap: Record<string, string> = {
    seoul: "서울",
    tokyo: "도쿄",
    london: "런던",
    paris: "파리",
    "new york": "뉴욕",
    busan: "부산",
    "los angeles": "로스앤젤레스",
    berlin: "베를린",
    "san gimignano": "산지미냐노",
    milan: "밀라노",
    beijing: "베이징",
    shanghai: "상하이",
    zurich: "취리히",
    sydney: "시드니",
    melbourne: "멜버른",
    osaka: "오사카",
    kyoto: "교토",
    glasgow: "글래스고",
    manchester: "맨체스터",
    lyon: "리옹",
    chicago: "시카고",
    munich: "뮌헨",
    venice: "베네치아",
    basel: "바젤",
    sapporo: "삿포로",
    savannah: "서배너",
    vienna: "비엔나",
    kassel: "카셀",
    "san francisco": "샌프란시스코",
    dallas: "댈러스",
    miami: "마이애미",
    seattle: "시애틀",
    houston: "휴스턴",
  };

  const jaMap: Record<string, string> = {
    seoul: "ソウル",
    tokyo: "東京",
    london: "ロンドン",
    paris: "パリ",
    "new york": "ニューヨーク",
    busan: "釜山",
    "los angeles": "ロサンゼルス",
    berlin: "ベルリン",
    milan: "ミラノ",
    beijing: "北京",
    shanghai: "上海",
    zurich: "チューリッヒ",
    sydney: "シドニー",
    melbourne: "メルボルン",
    osaka: "大阪",
    kyoto: "京都",
    chicago: "シカゴ",
    munich: "ミュンヘン",
    venice: "ヴェネツィア",
    basel: "バーゼル",
    sapporo: "札幌",
    vienna: "ウィーン",
    "san francisco": "サンフランシスコ",
    dallas: "ダラス",
    miami: "マイアミ",
    seattle: "シアトル",
    houston: "ヒューストン",
  };

  if (lang === "ko") return koMap[key] || city;
  if (lang === "ja") return jaMap[key] || city;
  return city;
}

async function fetchMe(): Promise<MeResponse | null> {
  try { const res = await fetch("/api/auth/me", { cache: "no-store" }); return (await res.json().catch(() => null)) as MeResponse | null; }
  catch { return null; }
}

export default function ArtistPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { country: autoCountry } = useAutoLocale();
  const isAdminView = searchParams.get("adminView") === "1";
  const [me, setMe] = useState<MeResponse | null>(null);
  const [adminReadOnly, setAdminReadOnly] = useState(false);
  const [ready, setReady] = useState(false);
  const { data: ocData, error: ocError, isLoading: ocLoading, mutate: mutateOc } = useFetch<{ openCalls: OpenCall[] }>(ready ? "/api/open-calls" : null);
  const { data: galleryData, error: galleryError, isLoading: galleryLoading, mutate: mutateGalleries } =
    useFetch<{ galleries: Gallery[] }>(ready ? "/api/public/galleries" : null);
  const { data: appData, mutate: mutateApps } = useFetch<{ applications: { openCallId: string }[] }>(ready && !adminReadOnly ? "/api/applications" : null);
  const openCalls = ocData?.openCalls ?? [];
  const galleries = galleryData?.galleries ?? [];
  const appliedIds = useMemo(() => new Set<string>((appData?.applications ?? []).map((a) => a.openCallId)), [appData]);
  const loading = ocLoading;
  const error = ocError?.message ?? null;
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"open-calls" | "galleries">("open-calls");
  const [countryFilter, setCountryFilter] = useState<string>("ALL");
  const [galleryContinentFilter, setGalleryContinentFilter] = useState<string>("ALL");
  const [galleryCountryFilter, setGalleryCountryFilter] = useState<string>("ALL");
  const [galleryCityFilter, setGalleryCityFilter] = useState<string>("ALL");
  const [showAllGalleryCities, setShowAllGalleryCities] = useState(false);
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryQuery, setGalleryQuery] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [hasAutoSelectedCountry, setHasAutoSelectedCountry] = useState(false);
  const [translatedById, setTranslatedById] = useState<
    Record<string, { theme?: string; galleryDescription?: string }>
  >({});
  const [showOriginalById, setShowOriginalById] = useState<Record<string, boolean>>({});
  const [translatingById, setTranslatingById] = useState<Record<string, boolean>>({});
  const preferredCountry = normalizeCountry(
    ((me?.profile?.country ?? "").trim() || (autoCountry ?? "").trim())
  );

  function load() {
    mutateOc();
    mutateGalleries();
    if (!adminReadOnly) mutateApps();
  }

  async function applyToOpenCall(openCallId: string, galleryId: string) {
    if (adminReadOnly) {
      alert(lang === "ko" ? "관리자 미리보기 모드에서는 지원할 수 없습니다." : "Apply is disabled in admin preview mode.");
      return;
    }
    setApplyingId(openCallId);
    try {
      const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ openCallId, galleryId }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.application) { alert(data?.error || "Application failed"); return; }
      mutateApps(); // Refresh applied IDs
      if (data.emailSent) alert("Application submitted! Your portfolio has been emailed to the gallery.");
      else alert("Application submitted successfully.");
    } catch { alert("Server error"); }
    finally { setApplyingId(null); }
  }

  useEffect(() => {
    (async () => {
      if (isAdminView) {
        const adminRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" }).catch(() => null);
        const adminData = adminRes ? await adminRes.json().catch(() => null) : null;
        if (adminData?.authenticated) {
          setAdminReadOnly(true);
          setReady(true);
          return;
        }
      }
      const m = await fetchMe();
      if (!m?.session) { router.replace("/login?role=artist"); return; }
      if (m.session.role !== "artist") { router.replace("/gallery"); return; }
      setMe(m);
      setReady(true); // Triggers SWR fetches
    })();
  }, [router, isAdminView]);

  // Dynamic country list from data
  const countries = useMemo(() => {
    const set = new Set(
      openCalls.map((o) => normalizeCountry((o.country ?? "").trim())).filter(Boolean)
    );
    const ordered = Array.from(set);
    if (preferredCountry) {
      const idx = ordered.indexOf(preferredCountry);
      if (idx > 0) {
        ordered.splice(idx, 1);
        ordered.unshift(preferredCountry);
      }
    }
    return ["ALL", ...ordered];
  }, [openCalls, preferredCountry]);

  const openCallCountryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: openCalls.length };
    for (const o of openCalls) {
      const c = normalizeCountry((o.country ?? "").trim());
      if (!c) continue;
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [openCalls]);

  const filtered = useMemo(() => {
    if (countryFilter === "ALL") return openCalls;
    return openCalls.filter((o) => normalizeCountry((o.country ?? "").trim()) === countryFilter);
  }, [openCalls, countryFilter]);

  const galleryContinents = useMemo(() => {
    const set = new Set(galleries.map((g) => continentFromCountry(g.country || "")).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [galleries]);

  const galleryContinentCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: galleries.length };
    galleries.forEach((g) => {
      const continent = continentFromCountry(g.country || "");
      counts[continent] = (counts[continent] || 0) + 1;
    });
    return counts;
  }, [galleries]);

  const galleryCountries = useMemo(() => {
    const scoped =
      galleryContinentFilter === "ALL"
        ? galleries
        : galleries.filter((g) => continentFromCountry(g.country || "") === galleryContinentFilter);
    const set = new Set(scoped.map((g) => (g.country ?? "").trim()).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [galleries, galleryContinentFilter]);

  const galleryCountryCounts = useMemo(() => {
    const scoped =
      galleryContinentFilter === "ALL"
        ? galleries
        : galleries.filter((g) => continentFromCountry(g.country || "") === galleryContinentFilter);
    const counts: Record<string, number> = { ALL: scoped.length };
    scoped.forEach((g) => {
      const c = String(g.country || "").trim();
      if (!c) return;
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [galleries, galleryContinentFilter]);

  const galleryCities = useMemo(() => {
    const byContinent =
      galleryContinentFilter === "ALL"
        ? galleries
        : galleries.filter((g) => continentFromCountry(g.country || "") === galleryContinentFilter);
    const scoped =
      galleryCountryFilter === "ALL"
        ? byContinent
        : byContinent.filter((g) => (g.country ?? "").trim() === galleryCountryFilter);
    const counts = new Map<string, number>();
    for (const g of scoped) {
      const city = normalizeDirectoryCity(g.country || "", g.city || "");
      if (!city) continue;
      counts.set(city, (counts.get(city) || 0) + 1);
    }
    const topCities = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 30)
      .map(([city]) => city);
    return ["ALL", ...topCities];
  }, [galleries, galleryContinentFilter, galleryCountryFilter]);

  useEffect(() => {
    if (!galleryCities.includes(galleryCityFilter)) setGalleryCityFilter("ALL");
  }, [galleryCities, galleryCityFilter]);

  useEffect(() => {
    setShowAllGalleryCities(false);
  }, [galleryContinentFilter, galleryCountryFilter]);

  useEffect(() => {
    if (!galleryContinents.includes(galleryContinentFilter)) setGalleryContinentFilter("ALL");
  }, [galleryContinents, galleryContinentFilter]);

  const filteredGalleries = useMemo(() => {
    const q = galleryQuery.trim().toLowerCase();
    return galleries.filter((g) => {
      if (
        galleryContinentFilter !== "ALL" &&
        continentFromCountry(g.country || "") !== galleryContinentFilter
      ) {
        return false;
      }
      if (galleryCountryFilter !== "ALL" && (g.country ?? "").trim() !== galleryCountryFilter) return false;
      if (
        galleryCityFilter !== "ALL" &&
        normalizeDirectoryCity(g.country || "", g.city || "") !== galleryCityFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (g.name || "").toLowerCase().includes(q) ||
        normalizeDirectoryCity(g.country || "", g.city || "").toLowerCase().includes(q) ||
        (g.city || "").toLowerCase().includes(q)
      );
    });
  }, [galleries, galleryContinentFilter, galleryCountryFilter, galleryCityFilter, galleryQuery]);

  const galleryPageSize = 10;
  const galleryTotalPages = Math.max(1, Math.ceil(filteredGalleries.length / galleryPageSize));
  const pagedGalleries = useMemo(() => {
    const start = (galleryPage - 1) * galleryPageSize;
    return filteredGalleries.slice(start, start + galleryPageSize);
  }, [filteredGalleries, galleryPage]);

  useEffect(() => {
    if (galleryPage > galleryTotalPages) setGalleryPage(galleryTotalPages);
  }, [galleryPage, galleryTotalPages]);

  useEffect(() => {
    setGalleryPage(1);
  }, [galleryContinentFilter, galleryCountryFilter, galleryCityFilter, galleryQuery]);

  const visibleGalleryCities = useMemo(() => {
    const limit = 12;
    if (showAllGalleryCities) return galleryCities;
    return galleryCities.slice(0, limit);
  }, [galleryCities, showAllGalleryCities]);

  useEffect(() => {
    if (hasAutoSelectedCountry) return;
    if (countryFilter !== "ALL") {
      setHasAutoSelectedCountry(true);
      return;
    }
    if (!preferredCountry) return;
    if (!countries.includes(preferredCountry)) return;
    setCountryFilter(preferredCountry);
    setHasAutoSelectedCountry(true);
  }, [hasAutoSelectedCountry, countryFilter, preferredCountry, countries]);

  async function translateOpenCall(id: string, theme: string, galleryDescription?: string) {
    const texts = [theme, galleryDescription?.trim() || ""].filter(Boolean);
    if (texts.length === 0) return;
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, targetLang: lang }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.translated)) return;
    const translated = data.translated as string[];
    setTranslatedById((prev) => ({
      ...prev,
      [id]: {
        theme: translated[0] || prev[id]?.theme,
        galleryDescription: texts.length > 1 ? translated[1] || prev[id]?.galleryDescription : prev[id]?.galleryDescription,
      },
    }));
  }

  async function toggleTranslation(openCall: OpenCall) {
    if (lang === "en") return;
    const hasTranslated = !!translatedById[openCall.id]?.theme;
    if (hasTranslated) {
      setShowOriginalById((prev) => ({ ...prev, [openCall.id]: !prev[openCall.id] }));
      return;
    }
    setTranslatingById((prev) => ({ ...prev, [openCall.id]: true }));
    try {
      await translateOpenCall(openCall.id, openCall.theme, openCall.galleryDescription);
      setShowOriginalById((prev) => ({ ...prev, [openCall.id]: false }));
    } finally {
      setTranslatingById((prev) => ({ ...prev, [openCall.id]: false }));
    }
  }

  useEffect(() => {
    if (lang === "en" || openCalls.length === 0) return;
    const targets = openCalls
      .filter((o) => !translatedById[o.id]?.theme)
      .slice(0, 20);
    if (targets.length === 0) return;
    (async () => {
      for (const item of targets) {
        await translateOpenCall(item.id, item.theme, item.galleryDescription);
      }
    })();
  }, [openCalls, lang, translatedById]);

  async function contactGallery(openCallId: string, galleryId: string) {
    if (adminReadOnly) {
      setContactError(lang === "ko" ? "관리자 미리보기 모드에서는 메시지를 보낼 수 없습니다." : "Messaging is disabled in admin preview mode.");
      return;
    }
    setContactError(null); setContactingId(openCallId);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ openCallId, galleryId }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.roomId) throw new Error(data?.error ?? "Failed");
      router.push(`/chat/${String(data.roomId)}`);
    } catch (e: any) { setContactError(e?.message ?? "Failed"); }
    finally { setContactingId(null); }
  }

  return (
    <>
      <TopBar />
      <style jsx global>{`
        @media (max-width: 768px) {
          .artist-header { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          .artist-header-btns { width: 100% !important; flex-wrap: wrap !important; }
          .artist-header-btns > * { flex: 1 1 auto !important; text-align: center !important; }
          .oc-card-inner { flex-direction: column !important; }
          .oc-poster { width: 100% !important; height: auto !important; aspect-ratio: 3/4 !important; max-height: 280px !important; }
          .oc-card-right { text-align: left !important; margin-left: 0 !important; margin-top: 12px !important; }
          .oc-card-actions { flex-wrap: wrap !important; }
          .country-tabs { -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .country-tabs::-webkit-scrollbar { display: none; }
        }
      `}</style>
      <main style={{ padding: "40px 20px", maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div className="artist-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>{t("artist_dashboard", lang)}</span>
            <h1 style={{ fontFamily: S, fontSize: "clamp(28px, 6vw, 42px)", fontWeight: 300, color: "#1A1A1A", marginTop: 8 }}>
              {t("artist_page_title", lang)}
            </h1>
            <p style={{ fontFamily: F, fontSize: 12, fontWeight: 300, color: "#8A8580", marginTop: 8 }}>
              {t("artist_browse_desc", lang)}
            </p>
          </div>
          <div className="artist-header-btns" style={{ display: "flex", gap: 10 }}>
            <button onClick={load} style={{ padding: "10px 16px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1A1A1A"; e.currentTarget.style.color = "#1A1A1A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; e.currentTarget.style.color = "#8A8580"; }}>
              {t("refresh", lang)}
            </button>
            <button onClick={() => router.push("/artist/me")} style={{ padding: "10px 16px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1A1A1A"; e.currentTarget.style.color = "#1A1A1A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; e.currentTarget.style.color = "#8A8580"; }}>
              {t("artist_my_profile", lang)}
            </button>
            <Link href="/open-calls" style={{ padding: "10px 16px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
              {t("artist_full_list", lang)}
            </Link>
          </div>
        </div>
        {adminReadOnly && (
          <div style={{ marginBottom: 20, padding: "12px 14px", border: "1px solid #E8E3DB", background: "#FAF8F4", color: "#8A8580", fontFamily: F, fontSize: 11, letterSpacing: "0.04em" }}>
            {lang === "ko" ? "관리자 미리보기 모드 (읽기 전용)" : "Admin preview mode (read-only)"}
          </div>
        )}

        {/* Personalized Recommendations */}
        <RecommendationBanner />

        {/* Community Section */}
        <div style={{ marginBottom: 36, border: "1px solid #E8E3DB", background: "#FFFFFF", padding: "clamp(20px, 3vw, 32px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <Link
                href="/community"
                style={{
                  fontFamily: F,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#8B7355",
                  textDecoration: "none",
                }}
              >
                {t("artist_community", lang)}
              </Link>
              <Link href="/community" style={{ textDecoration: "none" }}>
                <h2
                  style={{
                    fontFamily: S,
                    fontSize: "clamp(20px, 4vw, 28px)",
                    fontWeight: 300,
                    color: "#1A1A1A",
                    marginTop: 6,
                    marginBottom: 4,
                  }}
                >
                  {t("artist_community_title", lang)}
                </h2>
              </Link>
              <p style={{ fontFamily: F, fontSize: 12, fontWeight: 300, color: "#8A8580", maxWidth: 500 }}>
                {t("artist_community_desc", lang)}
              </p>
            </div>
          </div>
          <div className="community-btns" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/community?cat=find_collab" style={{
              padding: "12px 20px", border: "1px solid #8B7355", background: "rgba(139,115,85,0.06)", color: "#8B7355",
              fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.3s",
            }}>
              <span style={{ fontSize: 14 }}>🎭</span> {t("artist_find_collab", lang)}
            </Link>
            <Link href="/community?cat=daily" style={{
              padding: "12px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580",
              fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.3s",
            }}>
              <span style={{ fontSize: 14 }}>☕</span> {t("artist_share_daily", lang)}
            </Link>
            <Link href="/community" style={{
              padding: "12px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580",
              fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.3s",
            }}>
              <span style={{ fontSize: 14 }}>💬</span> {t("artist_all_posts", lang)}
            </Link>
          </div>
        </div>

        {/* View tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button
            onClick={() => setActiveTab("open-calls")}
            style={{
              padding: "10px 16px",
              border: activeTab === "open-calls" ? "1px solid #1A1A1A" : "1px solid #E8E3DB",
              background: activeTab === "open-calls" ? "#1A1A1A" : "#FFFFFF",
              color: activeTab === "open-calls" ? "#FFFFFF" : "#8A8580",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {lang === "ko" ? "오픈콜 탭" : lang === "ja" ? "オープンコール" : "Open Calls"}
          </button>
          <button
            onClick={() => setActiveTab("galleries")}
            style={{
              padding: "10px 16px",
              border: activeTab === "galleries" ? "1px solid #1A1A1A" : "1px solid #E8E3DB",
              background: activeTab === "galleries" ? "#1A1A1A" : "#FFFFFF",
              color: activeTab === "galleries" ? "#FFFFFF" : "#8A8580",
              fontFamily: F,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {lang === "ko" ? "갤러리 목록 탭" : lang === "ja" ? "ギャラリー一覧" : "Gallery List"}
          </button>
        </div>

        {activeTab === "open-calls" ? (
          <>
            {/* Country tabs - dynamic */}
            <div className="country-tabs" style={{ display: "flex", gap: 0, marginBottom: 32, overflowX: "auto", borderBottom: "1px solid #E8E3DB", WebkitOverflowScrolling: "touch" }}>
              {countries.map((c) => {
                const active = c === countryFilter;
                return (
                  <button
                    key={c}
                    onClick={() => setCountryFilter(c)}
                    style={{
                      padding: "14px 20px",
                      border: "none",
                      borderBottom: active ? "1px solid #1A1A1A" : "1px solid transparent",
                      background: "transparent",
                      fontFamily: F,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: active ? "#1A1A1A" : "#B0AAA2",
                      cursor: "pointer",
                      marginBottom: -1,
                      whiteSpace: "nowrap",
                      transition: "all 0.3s",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>{c}</span>
                    <span
                      style={{
                        fontSize: 9,
                        opacity: 0.85,
                        padding: "2px 6px",
                        background: active ? "rgba(26,26,26,0.08)" : "#F5F0EB",
                        color: active ? "#1A1A1A" : "#8A8580",
                      }}
                    >
                      {openCallCountryCounts[c] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Open-call content */}
            {loading ? (
              <div style={{ padding: "clamp(20px, 3vw, 48px)" }}>
                <CardSkeleton count={5} />
              </div>
            ) : error ? (
              <div style={{ padding: 20, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>
                {error}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
                {filtered.map((o, index) => (
                  <div key={o.id} onClick={() => router.push(`/open-calls/${o.id}`)} style={{ background: "#FFFFFF", padding: "clamp(20px, 3vw, 32px) clamp(16px, 3vw, 36px)", cursor: "pointer", transition: "background 0.3s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                    <div className="oc-card-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                      <OpenCallPoster className="oc-poster" posterImage={o.posterImage} gallery={o.gallery} theme={o.theme} city={o.city} country={o.country} deadline={o.deadline} width={100} height={134} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <span style={{ fontFamily: S, fontSize: 18, fontWeight: 300, color: "#D4CEC4" }}>{String(index + 1).padStart(2, "0")}</span>
                          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355" }}>
                            {normalizeCountry(o.country)} / {o.city}
                          </span>
                        </div>
                        <h3 style={{ fontFamily: S, fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 400, color: "#1A1A1A", marginBottom: 6 }}>{o.gallery}</h3>
                        <p style={{ fontFamily: F, fontSize: 13, fontWeight: 300, color: "#8A8580", wordBreak: "break-word" }}>
                          {lang !== "en" && translatedById[o.id]?.theme && !showOriginalById[o.id] ? translatedById[o.id]?.theme : o.theme}
                        </p>
                      </div>
                      <div className="oc-card-right" style={{ textAlign: "right", flexShrink: 0, marginLeft: 24, minWidth: 140 }}>
                        <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>
                          {lang === "ko" ? "전시 날짜" : "Exhibition"}
                        </span>
                        <div style={{ fontFamily: S, fontSize: 16, fontWeight: 400, color: "#1A1A1A", marginTop: 4 }}>{o.exhibitionDate || "-"}</div>
                        <span style={{ display: "block", marginTop: 8, fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>
                          {lang === "ko" ? "지원 마감" : t("deadline", lang)}
                        </span>
                        <div style={{ fontFamily: S, fontSize: 16, fontWeight: 400, color: "#1A1A1A", marginTop: 4 }}>{o.deadline}</div>
                      </div>
                    </div>
                    <div className="oc-card-actions" style={{ marginTop: 16, display: "flex", gap: 10 }}>
                      {adminReadOnly ? (
                        <span style={{ padding: "10px 20px", border: "1px solid #E8E3DB", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {lang === "ko" ? "읽기 전용" : "Read-only"}
                        </span>
                      ) : appliedIds.has(o.id) ? (
                        <span style={{ padding: "10px 20px", border: "1px solid #5A7A5A", color: "#5A7A5A", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("applied", lang)}</span>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); applyToOpenCall(o.id, o.galleryId); }} disabled={applyingId === o.id}
                          style={{ padding: "10px 20px", border: "none", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                          {applyingId === o.id ? "..." : t("apply", lang)}
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/open-calls/${o.id}`); }}
                        style={{ padding: "10px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                        {t("details", lang)}
                      </button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ background: "#FFFFFF", padding: 48, textAlign: "center" }}>
                    <p style={{ fontFamily: S, fontSize: 18, fontStyle: "italic", color: "#B0AAA2" }}>{t("artist_no_open_calls", lang)}</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Gallery list filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {galleryContinents.map((c) => (
                <button
                  key={c}
                  onClick={() => { setGalleryContinentFilter(c); setGalleryCountryFilter("ALL"); setGalleryCityFilter("ALL"); }}
                  style={{
                    padding: "8px 12px",
                    border: c === galleryContinentFilter ? "1px solid #1A1A1A" : "1px solid #E8E3DB",
                    background: c === galleryContinentFilter ? "#1A1A1A" : "#FFFFFF",
                    color: c === galleryContinentFilter ? "#FFFFFF" : "#8A8580",
                    fontFamily: F,
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {localizeContinentLabel(c, lang)}
                  <span style={{ fontSize: 9, opacity: 0.75, padding: "2px 6px", background: c === galleryContinentFilter ? "rgba(255,255,255,0.2)" : "#F5F0EB" }}>
                    {galleryContinentCounts[c] || 0}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {galleryCountries.map((c) => (
                <button key={c} onClick={() => { setGalleryCountryFilter(c); setGalleryCityFilter("ALL"); }}
                  style={{ padding: "8px 12px", border: c === galleryCountryFilter ? "1px solid #1A1A1A" : "1px solid #E8E3DB", background: c === galleryCountryFilter ? "#1A1A1A" : "#FFFFFF", color: c === galleryCountryFilter ? "#FFFFFF" : "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  {c}
                  <span style={{ fontSize: 9, opacity: 0.75, padding: "2px 6px", background: c === galleryCountryFilter ? "rgba(255,255,255,0.2)" : "#F5F0EB" }}>
                    {galleryCountryCounts[c] || 0}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {visibleGalleryCities.map((c) => (
                <button key={c} onClick={() => setGalleryCityFilter(c)}
                  style={{ padding: "7px 12px", border: c === galleryCityFilter ? "1px solid #8B7355" : "1px solid #E8E3DB", background: c === galleryCityFilter ? "rgba(139,115,85,0.08)" : "#FFFFFF", color: c === galleryCityFilter ? "#8B7355" : "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                  {c === "ALL" ? c : localizeCityLabel(c, lang)}
                </button>
              ))}
            </div>
            {galleryCities.length > 12 && (
              <div style={{ marginBottom: 14 }}>
                <button
                  onClick={() => setShowAllGalleryCities((v) => !v)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #E8E3DB",
                    background: "#FFFFFF",
                    color: "#8A8580",
                    fontFamily: F,
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {showAllGalleryCities
                    ? (lang === "ko" ? "접기" : lang === "ja" ? "折りたたむ" : "Collapse")
                    : (lang === "ko" ? "도시 더보기" : lang === "ja" ? "都市をもっと見る" : "More Cities")}
                </button>
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <input
                value={galleryQuery}
                onChange={(e) => setGalleryQuery(e.target.value)}
                placeholder={lang === "ko" ? "갤러리명/도시 검색..." : lang === "ja" ? "ギャラリー名/都市を検索..." : "Search gallery name/city..."}
                style={{ width: "100%", maxWidth: 420, padding: "12px 14px", border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 12, color: "#1A1A1A", outline: "none" }}
              />
            </div>

            {galleryLoading ? (
              <div style={{ padding: "clamp(20px, 3vw, 48px)" }}>
                <CardSkeleton count={5} />
              </div>
            ) : galleryError ? (
              <div style={{ padding: 20, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>
                {galleryError.message}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 1, background: "#E8E3DB" }}>
                {pagedGalleries.map((g, idx) => (
                  <div key={g.userId} onClick={() => router.push(`/galleries/${encodeURIComponent(g.userId)}`)}
                    style={{ background: "#FFFFFF", padding: "18px 20px", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FAF8F4"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontFamily: S, fontSize: 16, color: "#D4CEC4" }}>{String((galleryPage - 1) * galleryPageSize + idx + 1).padStart(2, "0")}</span>
                          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8B7355" }}>
                            {[g.country, localizeCityLabel(normalizeDirectoryCity(g.country || "", g.city || ""), lang)].filter(Boolean).join(" / ")}
                          </span>
                        </div>
                        <h3 style={{ fontFamily: S, fontSize: 22, fontWeight: 400, color: "#1A1A1A", margin: 0 }}>{g.name}</h3>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/galleries/${encodeURIComponent(g.userId)}`); }}
                        style={{ padding: "9px 14px", border: "1px solid #E8E3DB", background: "#FFFFFF", color: "#8A8580", fontFamily: F, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer" }}
                      >
                        {lang === "ko" ? "상세 보기" : lang === "ja" ? "詳細" : "View"}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredGalleries.length === 0 && (
                  <div style={{ background: "#FFFFFF", padding: 48, textAlign: "center" }}>
                    <p style={{ fontFamily: S, fontSize: 18, fontStyle: "italic", color: "#B0AAA2" }}>
                      {lang === "ko" ? "조건에 맞는 갤러리가 없습니다." : lang === "ja" ? "条件に合うギャラリーがありません。" : "No galleries found."}
                    </p>
                  </div>
                )}
              </div>
            )}
            {!galleryLoading && !galleryError && filteredGalleries.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontFamily: F, fontSize: 10, color: "#8A8580", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {lang === "ko"
                    ? `${galleryPage} / ${galleryTotalPages} 페이지`
                    : lang === "ja"
                      ? `${galleryPage} / ${galleryTotalPages} ページ`
                      : `Page ${galleryPage} / ${galleryTotalPages}`}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setGalleryPage((p) => Math.max(1, p - 1))}
                    disabled={galleryPage <= 1}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #E8E3DB",
                      background: "#FFFFFF",
                      color: galleryPage <= 1 ? "#C8C2B9" : "#8A8580",
                      fontFamily: F,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: galleryPage <= 1 ? "default" : "pointer",
                    }}
                  >
                    {lang === "ko" ? "이전" : lang === "ja" ? "前へ" : "Prev"}
                  </button>
                  <button
                    onClick={() => setGalleryPage((p) => Math.min(galleryTotalPages, p + 1))}
                    disabled={galleryPage >= galleryTotalPages}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #E8E3DB",
                      background: "#FFFFFF",
                      color: galleryPage >= galleryTotalPages ? "#C8C2B9" : "#8A8580",
                      fontFamily: F,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: galleryPage >= galleryTotalPages ? "default" : "pointer",
                    }}
                  >
                    {lang === "ko" ? "다음" : lang === "ja" ? "次へ" : "Next"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {contactError && (
          <div style={{ marginTop: 20, padding: 16, border: "1px solid rgba(139,74,74,0.2)", background: "rgba(139,74,74,0.04)", color: "#8B4A4A", fontFamily: F, fontSize: 12 }}>
            {contactError}
          </div>
        )}
      </main>
    </>
  );
}
