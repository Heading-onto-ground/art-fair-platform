"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

type Data = {
  name: string;
  userId?: string | null;
  workNote?: string | null;
  country?: string | null;
  city?: string | null;
  genre?: string | null;
  startedYear?: number | null;
  profileImage?: string | null;
  exhibitions: Exhibition[];
  series: SeriesItem[];
  artEvents: ArtEventItem[];
};

export default function ArtistProfileV2() {
  const { artistId } = useParams<{ artistId: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [me, setMe] = useState<{ session?: { userId: string; role: string } } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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
  const yearsActive = data?.startedYear
    ? new Date().getFullYear() - data.startedYear
    : null;

  if (notFound) {
    return (
      <>
        <TopBar />
        <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-8">
          <p className="text-[#6B7280] text-sm">Exhibition history is not public.</p>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <TopBar />
        <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-8">
          <p className="text-[#6B7280] text-sm">Loading...</p>
        </main>
      </>
    );
  }

  // Merge exhibitions + artEvents into timeline (simplified)
  const timelineItems = [
    ...data.exhibitions.map((e) => ({
      type: "exhibition" as const,
      date: e.acceptedAt,
      title: e.galleryName,
      subtitle: e.theme,
      location: `${e.city}, ${e.country}`,
      thumb: null as string | null,
      curator: null as string | null,
      collaborators: [] as string[],
    })),
    ...data.artEvents.map((e) => ({
      type: "event" as const,
      date: `${e.year}-01-01`,
      title: e.title,
      subtitle: e.eventType,
      location: e.description ?? "",
      thumb: null as string | null,
      curator: null as string | null,
      collaborators: [] as string[],
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <TopBar />
      <main className="min-h-screen bg-[#F8F9FA]">
        {/* ─── 1. Hero / Header ─── */}
        <section className="relative">
          <div
            className="h-48 sm:h-64 md:h-80 w-full bg-cover bg-center"
            style={{
              backgroundImage: data.profileImage
                ? `url(${data.profileImage})`
                : "linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)",
              filter: "blur(12px)",
              transform: "scale(1.05)",
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F8F9FA]"
            style={{ background: "linear-gradient(180deg, transparent 40%, #F8F9FA 100%)" }}
          />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 pb-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-[120px] md:h-[120px] rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#E5E7EB] flex items-center justify-center">
                {data.profileImage ? (
                  <img
                    src={data.profileImage}
                    alt={data.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl font-semibold text-[#9CA3AF]">
                    {data.name?.charAt(0)?.toUpperCase() || "A"}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-2xl sm:text-3xl md:text-[48px] font-semibold text-[#1A1A1A] tracking-tight">
                {data.name}
              </h1>
              {data.workNote && (
                <p className="mt-2 text-base sm:text-lg md:text-2xl text-[#6B7280] max-w-[600px]">
                  {data.workNote}
                </p>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {data.country && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-[#E5E7EB] text-[#1A1A1A]">
                    {data.country}
                  </span>
                )}
                {data.genre && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-[#E5E7EB] text-[#1A1A1A]">
                    {data.genre}
                  </span>
                )}
                {yearsActive != null && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-[#E5E7EB] text-[#1A1A1A]">
                    {yearsActive}yrs
                  </span>
                )}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {isOwner && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
                  >
                    Add Exhibition
                  </button>
                )}
                <Link
                  href={`/api/artist-portfolio/${encodeURIComponent(data.userId ?? "")}`}
                  target="_blank"
                  className="px-6 py-3 border border-[#E5E7EB] bg-white hover:bg-[#F8F9FA] text-[#1A1A1A] text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
                >
                  View PDF CV
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. Timeline Section ─── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h2 className="text-xl font-semibold text-[#1A1A1A]">Activity Timeline</h2>
            {isOwner && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0066FF] hover:bg-[#0066FF]/10 rounded-lg transition-colors self-start sm:self-center"
              >
                <span className="text-lg">+</span> Add Past Exhibition
              </button>
            )}
          </div>

          <div className="relative pl-6 sm:pl-8 border-l-2 border-[#E5E7EB]">
            {timelineItems.length === 0 ? (
              <div className="py-12 text-center text-[#6B7280]">
                <p className="text-sm">No exhibitions yet.</p>
                {isOwner && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 px-6 py-3 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-medium rounded-lg"
                  >
                    + Add your first exhibition
                  </button>
                )}
              </div>
            ) : (
              timelineItems.map((item, i) => (
                <div key={i} className="relative pb-8 last:pb-0">
                  <div
                    className="absolute left-0 top-2 w-3 h-3 -translate-x-[7px] rounded-full bg-[#0066FF] border-2 border-white"
                    style={{ left: -6 }}
                  />
                  <div className="ml-4 sm:ml-6 p-4 sm:p-5 bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
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
                          {new Date(item.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                          })}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-[#1A1A1A]">
                          {item.title}
                        </h3>
                        {item.subtitle && (
                          <p className="mt-0.5 text-sm text-[#6B7280]">{item.subtitle}</p>
                        )}
                        {item.location && (
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
              ))
            )}
          </div>
        </section>

        {/* ─── 3. Works Grid ─── */}
        {data.series && data.series.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
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
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── 4. Exhibitions List (redundant if timeline has it, but for clarity) ─── */}
        {data.exhibitions.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">
              Exhibitions & Collaborations
            </h2>
            <div className="space-y-3">
              {data.exhibitions.map((ex, i) => (
                <div
                  key={i}
                  className="p-4 bg-white border border-[#E5E7EB] rounded-xl"
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

        {/* ─── 5. Network (placeholder) ─── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">Collaborated with</h2>
          <div className="flex flex-wrap gap-4">
            {timelineItems
              .flatMap((t) => t.collaborators)
              .filter((c, i, arr) => arr.indexOf(c) === i)
              .slice(0, 6)
              .map((c) => (
                <div
                  key={c}
                  className="flex flex-col items-center gap-2 p-3 bg-white border border-[#E5E7EB] rounded-xl min-w-[80px]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] font-medium">
                    {c.charAt(0)}
                  </div>
                  <span className="text-xs text-[#1A1A1A] truncate max-w-[80px]">{c}</span>
                </div>
              ))}
            {timelineItems.flatMap((t) => t.collaborators).length === 0 && (
              <p className="text-sm text-[#6B7280]">Collaborations will appear here.</p>
            )}
          </div>
        </section>

        {/* ─── 6. Footer ─── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert("Link copied to clipboard!");
            }}
            className="px-6 py-3 border border-[#E5E7EB] bg-white hover:bg-[#F8F9FA] text-[#1A1A1A] text-sm font-medium rounded-lg transition-colors"
          >
            Share this profile
          </button>
        </section>
      </main>

      {showAddModal && (
        <AddExhibitionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
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
          className="fixed bottom-6 right-6 w-14 h-14 md:hidden rounded-full bg-[#0066FF] text-white shadow-lg flex items-center justify-center text-2xl z-50"
        >
          +
        </button>
      )}
    </>
  );
}
