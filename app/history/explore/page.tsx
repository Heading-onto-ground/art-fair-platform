import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { listExplore } from "@/lib/history/queries";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import "@/app/components/history/history.css";

export const dynamic = "force-dynamic";

export default async function HistoryExplorePage() {
  let data = { artists: [] as { slug: string; canonicalName: string; nativeName: string | null; exhibitionCount: number }[], exhibitions: [] as { slug: string | null; title: string; year: number | null }[], paths: [] as { slug: string | null; title: string; year: number | null; artists: { slug: string; name: string }[] }[], spaces: [] as { slug: string; name: string; city: string | null; country: string | null }[], decades: [] as number[], cities: [] as string[], countries: [] as string[] };
  let unavailable = false;
  try {
    data = await listExplore();
  } catch (error) {
    unavailable = isMissingHistorySchema(error);
    if (!unavailable) console.error("history explore failed", error);
  }
  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap">
        <h1 className="rh-title">Explore the art world</h1>
        {unavailable ? <p>Documented records will appear after the history schema is applied.</p> : null}
        {data.paths.length > 0 ? (
          <>
            <h2>Follow a documented path</h2>
            <ul className="rh-list">
              {data.paths.map((path) => (
                <li key={path.slug || path.title}>
                  {path.year ? `${path.year} · ` : ""}
                  {path.slug ? <Link href={`/exhibitions/${path.slug}`}>{path.title}</Link> : path.title}
                  <div>
                    {path.artists.map((artist, index) => (
                      <span key={artist.slug}>
                        {index > 0 ? " · " : ""}
                        <Link href={`/artists/${artist.slug}`}>{artist.name}</Link>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <h2>Artists</h2>
        <ul className="rh-list">
          {data.artists.map((artist) => (
            <li key={artist.slug}>
              <Link href={`/artists/${artist.slug}`}>{artist.canonicalName}</Link>
              {artist.nativeName ? ` ${artist.nativeName}` : ""} · {artist.exhibitionCount} documented exhibitions
            </li>
          ))}
        </ul>
        <h2>Exhibitions</h2>
        <ul className="rh-list">
          {data.exhibitions.map((exhibition) => (
            <li key={exhibition.slug || exhibition.title}>
              {exhibition.slug ? <Link href={`/exhibitions/${exhibition.slug}`}>{exhibition.title}</Link> : exhibition.title}
              {exhibition.year ? ` · ${exhibition.year}` : ""}
            </li>
          ))}
        </ul>
        <h2>Spaces</h2>
        <ul className="rh-list">
          {data.spaces.map((space) => (
            <li key={space.slug}>
              <Link href={`/spaces/${space.slug}`}>{space.name}</Link>
              {space.city || space.country ? ` · ${[space.city, space.country].filter(Boolean).join(", ")}` : ""}
            </li>
          ))}
        </ul>
        {data.decades.length > 0 ? <p>Decades: {data.decades.join(", ")}</p> : null}
        {data.cities.length > 0 ? <p>Cities: {data.cities.join(", ")}</p> : null}
        {data.countries.length > 0 ? <p>Countries: {data.countries.join(", ")}</p> : null}
      </main>
    </div>
  );
}
