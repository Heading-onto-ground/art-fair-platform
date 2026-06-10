import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";

// Embeds are thin by design; keep them out of the index (also enforced via X-Robots-Tag).
export const metadata: Metadata = { robots: { index: false, follow: true } };
export const revalidate = 3600;

const F = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

type ProfileRow = { id: string; name: string; artistId: string; exhibitions_public: boolean };
type ExhibitionRow = { galleryName: string; theme: string; country: string; city: string; acceptedAt: string };

function fmtYear(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : String(dt.getFullYear());
}

export default async function ArtistEmbedPage({ params }: { params: { artistId: string } }) {
  const profileRows = (await prisma
    .$queryRawUnsafe(
      `SELECT id, name, "artistId", "exhibitions_public" FROM "ArtistProfile" WHERE "artistId" = $1 LIMIT 1`,
      params.artistId
    )
    .catch(() => [])) as ProfileRow[];
  const profile = profileRows[0];

  if (!profile || !profile.exhibitions_public) {
    return (
      <div style={{ fontFamily: F, fontSize: 12, color: "#8A8580", padding: 20, textAlign: "center" }}>
        Record not available.
      </div>
    );
  }

  const exhibitions = (await prisma
    .$queryRawUnsafe(
      `SELECT "galleryName", theme, country, city, "acceptedAt"
       FROM artist_exhibitions WHERE "artistId" = (
         SELECT "userId" FROM "ArtistProfile" WHERE "artistId" = $1 LIMIT 1
       ) ORDER BY "acceptedAt" DESC LIMIT 6`,
      params.artistId
    )
    .catch(() => [])) as ExhibitionRow[];

  type EventRow = { id: string; eventType: string; title: string; year: number };
  const events: EventRow[] = await prisma.artEvent
    .findMany({
      where: { artistId: profile.id, isPublic: true },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      select: { id: true, eventType: true, title: true, year: true },
      take: 6,
    })
    .catch(() => [] as EventRow[]);

  const profileUrl = `${SITE_URL}/artist/public/${encodeURIComponent(profile.artistId)}`;
  const hasContent = exhibitions.length > 0 || events.length > 0;

  return (
    <div style={{ fontFamily: F, background: "#FDFBF7", border: "1px solid #E8E3DB", padding: "18px 20px", maxWidth: 420, margin: "0 auto" }}>
      <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8B7355", margin: "0 0 6px" }}>
        Exhibition History on ROB
      </p>
      <h1 style={{ fontSize: 17, fontWeight: 600, color: "#1A1A1A", margin: "0 0 12px" }}>{profile.name}</h1>

      {!hasContent && (
        <p style={{ fontSize: 12, color: "#8A8580", margin: "0 0 12px" }}>No public records yet.</p>
      )}

      {exhibitions.map((e, i) => (
        <div key={`x${i}`} style={{ padding: "8px 0", borderTop: "1px solid #F0EBE3" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#2A2A2A", lineHeight: 1.4 }}>{e.theme}</div>
          <div style={{ fontSize: 10, color: "#8A8580", marginTop: 2 }}>
            {[fmtYear(e.acceptedAt), e.galleryName, [e.city, e.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
          </div>
        </div>
      ))}

      {events.map((ev) => (
        <div key={ev.id} style={{ padding: "8px 0", borderTop: "1px solid #F0EBE3" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#2A2A2A", lineHeight: 1.4 }}>{ev.title}</div>
          <div style={{ fontSize: 10, color: "#8A8580", marginTop: 2 }}>
            {ev.year} · {ev.eventType.replace(/_/g, " ")}
          </div>
        </div>
      ))}

      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-block", marginTop: 14, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355", textDecoration: "none" }}
      >
        View full record on ROB →
      </a>
    </div>
  );
}
