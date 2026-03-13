"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { F, S } from "@/lib/design";

const EVENT_LABEL: Record<string, string> = {
  exhibition: "Exhibition", collaboration: "Collaboration", publication: "Publication",
  series_start: "Series", residency: "Residency", award: "Award",
  grant: "Grant", opencall_result: "Open Call", press: "Press",
};
const EVENT_COLOR: Record<string, string> = {
  exhibition: "#8B7355", collaboration: "#5A7A5A", publication: "#5A5A8B",
  series_start: "#8B5A5A", residency: "#4A7A8B", award: "#8B7A2A",
  grant: "#2A7A5A", opencall_result: "#7A4A8B", press: "#6A6A6A",
};

type FeedItem = {
  id: string; eventType: string; title: string; year: number;
  description?: string | null;
  artist: { name: string; artistId: string; profileImage?: string | null };
};

export default function FeedPage() {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    fetch("/api/follow?feed=1")
      .then(r => r.json())
      .then(d => {
        const items = d.feed ?? [];
        setFeed(items);
        setEmpty(items.length === 0);
      })
      .catch(() => setEmpty(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "56px 40px" }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8A8A8A" }}>Activity</span>
        <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", marginTop: 8, marginBottom: 32 }}>Feed</h1>

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>Loading...</p>
        ) : empty ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <p style={{ fontFamily: S, fontSize: 20, fontStyle: "italic", color: "#8A8A8A", marginBottom: 16 }}>No activity yet.</p>
            <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", marginBottom: 24 }}>Follow artists to see their activity here.</p>
            <button onClick={() => router.push("/artists")} style={{ padding: "12px 28px", border: "1px solid #1A1A1A", background: "#1A1A1A", color: "#FFFFFF", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
              Browse Artists
            </button>
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 1, background: "#E8E3DB" }} />
            {feed.map(ev => (
              <div key={ev.id} style={{ position: "relative", marginBottom: 28, paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: -1, top: 5, width: 9, height: 9, borderRadius: "50%", background: EVENT_COLOR[ev.eventType] ?? "#8A8580", border: "2px solid #FDFBF7" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, cursor: "pointer" }} onClick={() => router.push(`/artist/public/${ev.artist.artistId}`)}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F5F1EB", overflow: "hidden", border: "1px solid #EDE6DA", flexShrink: 0 }}>
                    {ev.artist.profileImage
                      ? <img src={ev.artist.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontFamily: S, fontSize: 11, color: "#D0C7BA" }}>{ev.artist.name.charAt(0)}</span>}
                  </div>
                  <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>{ev.artist.name}</span>
                  <span style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: EVENT_COLOR[ev.eventType] ?? "#8A8580", padding: "2px 8px", background: "rgba(139,115,85,0.07)" }}>
                    {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                  </span>
                  <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{ev.year}</span>
                </div>
                <p style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", margin: "0 0 4px" }}>{ev.title}</p>
                {ev.description && <p style={{ fontFamily: F, fontSize: 12, color: "#6A6660", margin: 0, lineHeight: 1.6 }}>{ev.description}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
