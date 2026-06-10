import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { F, S, colors } from "@/lib/design";
import { pageMetadata } from "@/lib/seo";
import { getCityContent } from "@/lib/cityData";

// ISR: city aggregates scan several tables; rebuild at most hourly instead of per-request.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const city = await getCityContent(params.slug);
  if (!city) {
    return pageMetadata({
      title: "Art City | ROB",
      description: "Discover galleries, artists, and open calls by city on ROB.",
      path: `/city/${params.slug}`,
      index: false,
    });
  }
  const name = city.displayName;
  return pageMetadata({
    title: `Art in ${name} — Galleries, Artists & Open Calls | ROB`,
    description: `Discover ${city.galleries.length} galleries, ${city.artists.length} artists, ${city.openCalls.length} open calls and ${city.exhibitions.length} exhibitions in ${name} on ROB — Role of Bridge.`,
    path: `/city/${params.slug}`,
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2
        style={{
          fontFamily: S,
          fontSize: 24,
          fontWeight: 400,
          color: colors.textPrimary,
          margin: "0 0 18px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

const itemStyle: React.CSSProperties = {
  display: "block",
  padding: "14px 16px",
  border: `1px solid ${colors.border}`,
  background: colors.bgCard,
  textDecoration: "none",
  marginBottom: 8,
};

export default async function CityPage({ params }: { params: { slug: string } }) {
  const city = await getCityContent(params.slug);
  if (!city) notFound();

  const name = city.displayName;

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "56px 24px", minHeight: "100vh" }}>
        <p
          style={{
            fontFamily: F,
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: colors.accent,
            margin: "0 0 10px",
          }}
        >
          Art City{city.country ? ` · ${city.country}` : ""}
        </p>
        <h1
          style={{
            fontFamily: S,
            fontSize: "clamp(32px,6vw,52px)",
            fontWeight: 400,
            color: colors.textPrimary,
            lineHeight: 1.15,
            margin: "0 0 14px",
          }}
        >
          Art in {name}
        </h1>
        <p style={{ fontFamily: F, fontSize: 15, color: colors.textSecondary, lineHeight: 1.7, margin: "0 0 44px" }}>
          Explore the contemporary art scene in {name}: {city.galleries.length} galleries,{" "}
          {city.artists.length} artists, {city.openCalls.length} open calls, and{" "}
          {city.exhibitions.length} exhibitions connected through ROB — Role of Bridge.
        </p>

        {city.openCalls.length > 0 && (
          <Section title={`Open Calls in ${name}`}>
            {city.openCalls.map((o) => (
              <Link key={o.id} href={`/open-calls/${o.id}`} style={itemStyle}>
                <span style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                  {o.theme}
                </span>
                <span style={{ display: "block", fontFamily: F, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                  {o.gallery}
                  {o.deadline ? ` · Deadline ${o.deadline}` : ""}
                </span>
              </Link>
            ))}
          </Section>
        )}

        {city.galleries.length > 0 && (
          <Section title={`Galleries in ${name}`}>
            {city.galleries.map((g) => (
              <Link key={g.userId} href={`/galleries/${g.userId}`} style={itemStyle}>
                <span style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                  {g.name}
                </span>
                {g.country && (
                  <span style={{ display: "block", fontFamily: F, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                    {g.country}
                  </span>
                )}
              </Link>
            ))}
          </Section>
        )}

        {city.artists.length > 0 && (
          <Section title={`Artists in ${name}`}>
            {city.artists.map((a) => (
              <Link key={a.userId} href={`/artists/${a.userId}`} style={itemStyle}>
                <span style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                  {a.name}
                </span>
                {(a.genre || a.country) && (
                  <span style={{ display: "block", fontFamily: F, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                    {[a.genre, a.country].filter(Boolean).join(" · ")}
                  </span>
                )}
              </Link>
            ))}
          </Section>
        )}

        {city.exhibitions.length > 0 && (
          <Section title={`Exhibitions in ${name}`}>
            {city.exhibitions.map((e) => (
              <Link key={e.id} href={`/exhibitions/${e.id}`} style={itemStyle}>
                <span style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                  {e.title}
                </span>
                {e.country && (
                  <span style={{ display: "block", fontFamily: F, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                    {e.country}
                  </span>
                )}
              </Link>
            ))}
          </Section>
        )}

        <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/open-calls" style={{ fontFamily: F, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent, textDecoration: "none" }}>
            All open calls →
          </Link>
          <Link href="/galleries" style={{ fontFamily: F, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent, textDecoration: "none" }}>
            All galleries →
          </Link>
        </div>
      </main>
    </>
  );
}
