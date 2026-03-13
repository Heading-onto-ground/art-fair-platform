"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import AddExhibitionModal from "./AddExhibitionModal";

type Exhibition = {
  galleryName: string;
  theme: string;
  country: string;
  city: string;
  acceptedAt: string;
};

type SeriesItem = {
  id: string;
  title: string;
  description?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  works?: string | null;
};

type ArtEventItem = {
  id: string;
  eventType: string;
  title: string;
  year: number;
  description?: string | null;
};

type SelfExhibition = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  city: string | null;
  country: string | null;
  createdAt?: string;
  space: { name: string; city: string | null; country: string | null } | null;
  curator: { name: string } | null;
  artists: Array<{ artist: { name: string; artistId: string } }>;
};

type Data = {
  name: string;
  userId?: string | null;
  workNote?: string | null;
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  genre?: string | null;
  startedYear?: number | null;
  profileImage?: string | null;
  exhibitions: Exhibition[];
  selfExhibitions?: SelfExhibition[];
  series: SeriesItem[];
  artEvents: ArtEventItem[];
};

export default function ArtistProfileV2() {
  const { artistId } = useParams<{ artistId: string }>();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Data | null>(null);
  const [me, setMe] = useState<{ session?: { userId: string; role: string } } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastWithShare, setToastWithShare] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);

  const ONBOARDING_KEY = "rob-artist-profile-onboarding-done";

  useEffect(() => {
    fetch(`/api/artist/public/${artistId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || d.error) setNotFound(true);
        else setData(d);
      })
      .catch(() => setNotFound(true));
    fetch("/api/auth/me?lite=1", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => setMe(null));
  }, [artistId]);

  const isOwner = me?.session?.role === "artist" && me?.session?.userId === data?.userId;

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (!isOwner || !data) return;
    const forceShow = searchParams.get("showOnboarding") === "1";
    if (forceShow) {
      if (typeof window !== "undefined") localStorage.removeItem(ONBOARDING_KEY);
      setOnboardingStep(1);
      return;
    }
    const done = typeof window !== "undefined" && localStorage.getItem(ONBOARDING_KEY);
    if (done) return;
    const t = setTimeout(() => setOnboardingStep(1), 3000);
    return () => clearTimeout(t);
  }, [isOwner, data, searchParams]);
  const yearsActive = data?.startedYear
    ? new Date().getFullYear() - data.startedYear
    : null;
  const bioText = (data?.bio || data?.workNote || "").trim();

  if (notFound) {
    return (
      <>
        <TopBar />
        <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 sm:p-8">
          <p className="text-[#6B7280] text-sm">Exhibition history is not public.</p>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <TopBar />
        <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 sm:p-8">
          <p className="text-[#6B7280] text-sm">Loading…</p>
        </main>
      </>
    );
  }

  const selfEx = (data.selfExhibitions ?? []) as SelfExhibition[];

  const timelineItems = [
    ...data.exhibitions.map((e) => ({
      type: "exhibition" as const,
      date: e.acceptedAt,
      title: e.galleryName,
      subtitle: e.theme,
      location: `${e.city || ""}, ${e.country || ""}`.replace(/^,\s*|,\s*$/g, "").trim(),
      thumb: null as string | null,
      curator: null as string | null,
      collaborators: [] as string[],
    })),
    ...selfEx.map((e) => {
      const collabs = (e.artists ?? [])
        .map((a) => a.artist?.name)
        .filter(Boolean) as string[];
      return {
        type: "exhibition" as const,
        date: e.startDate || (e as { createdAt?: string }).createdAt || new Date().toISOString(),
        title: e.title,
        subtitle: null as string | null,
        location: [e.space?.name, e.space?.city, e.space?.country].filter(Boolean).join(", ") || e.city || "",
        thumb: null as string | null,
        curator: e.curator?.name ?? null,
        collaborators: collabs,
      };
    }),
    ...data.artEvents.map((e) => ({
      type: "event" as const,
      date: `${e.year}-01-01`,
      title: e.title,
      subtitle: e.eventType,
      location: (e.description ?? "").trim(),
      thumb: null as string | null,
      curator: null as string | null,
      collaborators: [] as string[],
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const collaborators = timelineItems
    .flatMap((t) => t.collaborators)
    .filter((c, i, arr) => arr.indexOf(c) === i);

  const collaboratorWithIds = selfEx.flatMap((e) =>
    (e.artists ?? [])
      .map((a) => ({ name: a.artist?.name, artistId: a.artist?.artistId }))
      .filter((x): x is { name: string; artistId: string } => !!x.name && !!x.artistId)
  );
  const uniqueCollabs = Array.from(
    new Map(collaboratorWithIds.map((c) => [c.artistId, c])).values()
  );

  return (
    <>
      <TopBar />
      <main className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A]">
        {/* ─── 1. Hero / Header ─── */}
        <section className="relative overflow-hidden">
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
            <button
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url).then(() => {
                  setToast("Link copied!");
                });
              }}
              className="p-2 rounded-lg bg-white/80 hover:bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
              title="Share profile"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
          </div>
          <div
            className="h-40 sm:h-56 md:h-72 lg:h-80 w-full bg-cover bg-center"
            style={{
              backgroundImage: data.profileImage
                ? `url(${data.profileImage})`
                : "linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)",
              filter: "blur(14px)",
              transform: "scale(1.08)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 35%, #F8F9FA 85%)",
            }}
          />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 sm:-mt-20 md:-mt-24 pb-10 sm:pb-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px] rounded-full border-4 border-white shadow-xl overflow-hidden bg-[#E5E7EB] flex items-center justify-center ring-2 ring-[#E5E7EB]">
                {data.profileImage ? (
                  <img
                    src={data.profileImage}
                    alt={data.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#9CA3AF]">
                    {data.name?.charAt(0)?.toUpperCase() || "A"}
                  </span>
                )}
              </div>
              <h1 className="mt-4 sm:mt-5 text-2xl sm:text-3xl md:text-4xl lg:text-[48px] font-bold text-[#1A1A1A] tracking-tight">
                {data.name}
              </h1>
              {bioText && (
                <p className="mt-2 sm:mt-3 text-base sm:text-lg md:text-2xl text-[#6B7280] max-w-[560px] leading-relaxed">
                  {bioText}
                </p>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {data.country && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/90 border border-[#E5E7EB] text-[#1A1A1A] shadow-sm">
                    {data.country}
                  </span>
                )}
                {data.genre && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/90 border border-[#E5E7EB] text-[#1A1A1A] shadow-sm">
                    {data.genre}
                  </span>
                )}
                {yearsActive != null && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/90 border border-[#E5E7EB] text-[#1A1A1A] shadow-sm">
                    {yearsActive}yrs
                  </span>
                )}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {isOwner && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                  >
                    Add Exhibition
                  </button>
                )}
                {data.userId && (
                  <Link
                    href={`/api/artist-portfolio/${encodeURIComponent(data.userId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 border border-[#E5E7EB] bg-white hover:bg-[#F8F9FA] text-[#1A1A1A] text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
                  >
                    View PDF CV
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. Timeline Section ─── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Activity Timeline</h2>
                {isOwner && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#0066FF] hover:bg-[#0066FF]/10 rounded-lg transition-colors"
                  >
                    <span className="text-lg leading-none">+</span> Add Past Exhibition
                  </button>
                )}
              </div>

              <div className="relative pl-6 sm:pl-8 border-l-2 border-[#E5E7EB]">
                {timelineItems.length === 0 ? (
                  <div className="py-12 sm:py-16 px-6 text-center bg-white/80 rounded-2xl border border-dashed border-[#E5E7EB]">
                    <div className="flex justify-center mb-6">
                      <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D1D5DB]">
                        <rect x="20" y="10" width="80" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
                        <circle cx="30" cy="16" r="3" fill="currentColor" opacity="0.4" />
                        <rect x="20" y="32" width="80" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
                        <circle cx="30" cy="38" r="3" fill="currentColor" opacity="0.4" />
                        <rect x="20" y="54" width="80" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
                        <circle cx="30" cy="60" r="3" fill="currentColor" opacity="0.4" />
                        <path d="M55 75 L65 85 L85 65" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                        <circle cx="70" cy="75" r="12" fill="#0066FF" fillOpacity="0.15" stroke="#0066FF" strokeWidth="1.5" />
                        <text x="70" y="79" textAnchor="middle" fill="#0066FF" fontSize="14" fontWeight="600">+</text>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
                      아직 기록된 활동이 없어요
                    </h3>
                    <p className="text-sm text-[#6B7280] max-w-md mx-auto leading-relaxed mb-6">
                      첫 전시를 추가하면 타임라인이 자동으로 쌓여요.
                      <br />
                      CV도 한 번에 정리되고, 큐레이터가 더 쉽게 발견할 수 있어요.
                    </p>
                    {isOwner && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-8 py-3.5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        첫 전시 추가하기
                      </button>
                    )}
                  </div>
                ) : (
                  timelineItems.map((item, i) => {
                    const d = new Date(item.date);
                    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
                    const displayTitle =
                      item.type === "exhibition"
                        ? `${item.subtitle ? `"${item.subtitle}"` : item.title} @ ${item.location || item.title}`
                        : item.title;
                    return (
                      <div key={i} className="relative pb-8 last:pb-0">
                        <div
                          className="absolute left-0 top-2 w-3 h-3 -translate-x-[7px] rounded-full bg-[#0066FF] border-2 border-white shadow"
                          style={{ left: -6 }}
                        />
                        <div className="ml-4 sm:ml-6 p-4 sm:p-5 bg-white border border-[#E5E7EB] rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex gap-4">
                            {item.thumb && (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#E5E7EB]">
                                <img
                                  src={item.thumb}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                                {dateStr}
                              </p>
                              <h3 className="mt-1 text-base font-semibold text-[#1A1A1A]">
                                {item.type === "exhibition" ? item.title : displayTitle}
                              </h3>
                              {item.type === "exhibition" && item.subtitle && (
                                <p className="mt-0.5 text-sm text-[#6B7280]">{item.subtitle}</p>
                              )}
                              {item.location && item.type !== "exhibition" && (
                                <p className="mt-1 text-sm text-[#6B7280]">@ {item.location}</p>
                              )}
                              {item.type === "exhibition" && item.location && (
                                <p className="mt-1 text-sm text-[#6B7280]">@ {item.location}</p>
                              )}
                              {(item.curator || item.collaborators.length > 0) && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {item.curator && (
                                    <span className="px-2 py-0.5 text-xs rounded bg-[#0066FF]/10 text-[#0066FF]">
                                      Curator: {item.curator}
                                    </span>
                                  )}
                                  {item.collaborators.map((c, j) => (
                                    <span
                                      key={j}
                                      className="px-2 py-0.5 text-xs rounded bg-[#E5E7EB] text-[#6B7280]"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sticky Add Past Exhibition (desktop) */}
            {isOwner && (
              <div className="hidden lg:block flex-shrink-0 w-48">
                <div className="sticky top-24">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[#0066FF] hover:bg-[#0066FF]/10 border border-[#0066FF]/30 rounded-xl transition-colors"
                  >
                    <span className="text-lg leading-none">+</span> Add Past Exhibition
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── 3. Works Grid ─── */}
        {data.series && data.series.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.series.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-[#E5E7EB] flex items-center justify-center">
                    <span className="text-4xl text-[#9CA3AF]">
                      {s.title?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#1A1A1A]">{s.title}</h3>
                    <p className="text-sm text-[#6B7280] mt-1">
                      {s.startYear ?? "?"} — {s.endYear ?? "present"}
                    </p>
                    {data.genre && (
                      <p className="text-xs text-[#6B7280] mt-0.5">{data.genre}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── 4. Exhibitions & Collaborations ─── */}
        {data.exhibitions.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">
              Exhibitions & Collaborations
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.exhibitions.map((ex, i) => (
                <div
                  key={i}
                  className="p-4 bg-white border border-[#E5E7EB] rounded-xl hover:shadow-sm transition-shadow"
                >
                  <h3 className="font-semibold text-[#1A1A1A]">{ex.galleryName}</h3>
                  <p className="text-sm text-[#6B7280]">{ex.theme}</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {ex.city}, {ex.country} ·{" "}
                    {new Date(ex.acceptedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── 5. Network ─── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">Collaborated with</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Circular node graph: 3개 이상일 때만 표시 (적을 때 빈 원만 여러 개 뜨는 것 방지) */}
            {(() => {
              const collabList = uniqueCollabs.length > 0 ? uniqueCollabs : collaborators.map((n) => ({ name: n, artistId: "" }));
              if (collabList.length < 3) return null;
              return (
                <div className="flex items-center justify-center sm:justify-start flex-shrink-0">
                  <div className="relative w-[140px] h-[140px] sm:w-[160px] sm:h-[160px]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0066FF] border-2 border-white shadow flex items-center justify-center text-white font-semibold text-sm">
                        {data.name?.charAt(0) || "A"}
                      </div>
                    </div>
                    {collabList.slice(0, 6).map((c, i) => {
                      const n = Math.max(collabList.length, 1);
                      const angle = (i / n) * 360 - 90;
                      const r = 48;
                      const cx = 70;
                      const x = cx + r * Math.cos((angle * Math.PI) / 180);
                      const y = cx + r * Math.sin((angle * Math.PI) / 180);
                      return (
                        <div
                          key={c.artistId || c.name}
                          className="absolute w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E5E7EB] border-2 border-white flex items-center justify-center text-[#6B7280] font-medium text-xs -translate-x-1/2 -translate-y-1/2"
                          style={{ left: x, top: y }}
                        >
                          {c.name?.charAt(0) || "?"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div className="flex flex-wrap gap-3 sm:flex-1">
              {uniqueCollabs.length === 0 && collaborators.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-[#6B7280]">
                    아직 협업 기록이 없어요
                  </p>
                  <p className="text-xs text-[#9CA3AF]">
                    전시를 추가하면 함께한 작가들이 자동으로 연결돼요.
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="self-start px-4 py-2 text-sm font-medium text-[#0066FF] hover:bg-[#0066FF]/10 rounded-lg transition-colors"
                    >
                      지금 전시 추가하기
                    </button>
                  )}
                </div>
              ) : (
                (uniqueCollabs.length > 0 ? uniqueCollabs : collaborators.map((n) => ({ name: n, artistId: "" }))).map((c) => (
                  c.artistId ? (
                    <Link
                      key={c.artistId}
                      href={`/artist/public/${c.artistId}`}
                      className="flex items-center gap-2 p-3 bg-white border border-[#E5E7EB] rounded-xl min-w-[100px] hover:border-[#0066FF]/30 hover:shadow-sm transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] font-medium text-sm flex-shrink-0">
                        {c.name?.charAt(0) || "?"}
                      </div>
                      <span className="text-sm text-[#1A1A1A] truncate max-w-[80px]">{c.name}</span>
                    </Link>
                  ) : (
                    <div
                      key={c.name}
                      className="flex items-center gap-2 p-3 bg-white border border-[#E5E7EB] rounded-xl min-w-[100px]"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] font-medium text-sm flex-shrink-0">
                        {c.name?.charAt(0) || "?"}
                      </div>
                      <span className="text-sm text-[#1A1A1A] truncate max-w-[80px]">{c.name}</span>
                    </div>
                  )
                ))
              )}
            </div>
          </div>
        </section>

        {/* ─── 6. Footer ─── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 pb-20 sm:pb-24">
          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url).then(() => {
                if (typeof window !== "undefined" && "toast" in window) {
                  (window as any).toast?.("Link copied!");
                } else {
                  alert("Link copied to clipboard!");
                }
              });
            }}
            className="px-6 py-3 border border-[#E5E7EB] bg-white hover:bg-[#F8F9FA] text-[#1A1A1A] text-sm font-medium rounded-lg transition-colors"
          >
            Share this profile
          </button>
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-3">
          <span>{toast}</span>
          {toastWithShare && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setToast("Link copied!");
                setToastWithShare(false);
              }}
              className="px-2 py-1 text-xs font-medium bg-white/20 hover:bg-white/30 rounded"
            >
              공유하기
            </button>
          )}
        </div>
      )}

      {onboardingStep !== null && isOwner && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-[#1A1A1A] mb-2">
              {onboardingStep === 1 && "여기서 당신의 이야기를 시작하세요"}
              {onboardingStep === 2 && "전시를 추가할수록 타임라인이 쌓여요"}
              {onboardingStep === 3 && "작품도 함께 올려보세요"}
            </h3>
            <p className="text-sm text-[#6B7280] mb-4">
              {onboardingStep === 1 && "Add Exhibition 버튼을 눌러 첫 전시를 등록해 보세요."}
              {onboardingStep === 2 && "전시를 등록하면 타임라인에 자동으로 쌓입니다."}
              {onboardingStep === 3 && "작품 시리즈를 추가하면 프로필이 더 풍부해져요."}
            </p>
            <div className="flex gap-3">
              {onboardingStep < 3 ? (
                <button
                  onClick={() => setOnboardingStep(step => (step ?? 1) + 1)}
                  className="flex-1 py-2.5 bg-[#0066FF] text-white text-sm font-medium rounded-lg"
                >
                  다음
                </button>
              ) : (
                <button
                  onClick={() => {
                    setOnboardingStep(null);
                    if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "1");
                  }}
                  className="flex-1 py-2.5 bg-[#0066FF] text-white text-sm font-medium rounded-lg"
                >
                  확인
                </button>
              )}
              <button
                onClick={() => {
                  setOnboardingStep(null);
                  if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "1");
                }}
                className="py-2.5 px-4 text-sm text-[#6B7280] hover:text-[#1A1A1A]"
              >
                건너뛰기
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddExhibitionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            setToast("전시가 타임라인에 추가됐습니다!");
            setToastWithShare(true);
            fetch(`/api/artist/public/${artistId}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => d && setData(d));
          }}
        />
      )}

      {/* FAB for mobile */}
      {isOwner && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 md:hidden rounded-full bg-[#0066FF] text-white shadow-lg flex items-center justify-center text-2xl z-50 hover:bg-[#0052CC] transition-colors"
          aria-label="Add exhibition"
        >
          +
        </button>
      )}
    </>
  );
}
