import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import ExploreTrack from "@/app/components/history/ExploreTrack";
import PathList from "@/app/components/history/PathList";
import { listExplore } from "@/lib/history/queries";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import "@/app/components/history/history.css";

export const dynamic = "force-dynamic";

export default async function HistoryExplorePage() {
  let data: Awaited<ReturnType<typeof listExplore>> | null = null;
  let unavailable = false;
  try {
    data = await listExplore();
  } catch (error) {
    unavailable = isMissingHistorySchema(error);
    if (!unavailable) console.error("history explore failed", error);
  }
  const artists = data?.artists ?? [];
  const moments = data?.moments ?? [];
  const routes = data?.routes ?? [];
  const spaces = data?.spaces ?? [];
  return (
    <div className="rh-page">
      <TopBar />
      <ExploreTrack />
      <main className="rh-wrap">
        <p className="rh-kicker">Explore</p>
        <h1 className="rh-title">Explore the art world</h1>
        {unavailable ? <p>Documented records will appear after the history schema is applied.</p> : null}

        {artists.length > 0 ? (
          <section>
            <h2>Journeys</h2>
            <ul className="rh-list">
              {artists.map((artist) => (
                <li key={artist.slug}>
                  <Link href={`/artists/${artist.slug}`}>{artist.canonicalName}</Link>
                  {artist.nativeName ? ` ${artist.nativeName}` : ""}
                  <div>
                    {artist.firstYear && artist.lastYear ? `${artist.firstYear}–${artist.lastYear} · ` : ""}
                    {artist.exhibitionCount} exhibitions currently documented
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {moments.length > 0 ? (
          <section>
            <h2>Moments</h2>
            <ul className="rh-list">
              {moments.map((moment) => (
                <li key={moment.id}>
                  <div>{moment.year ?? "Year not recorded"}</div>
                  {moment.slug ? <Link href={`/exhibitions/${moment.slug}`}>{moment.title}</Link> : <strong>{moment.title}</strong>}
                  {moment.place ? <div>{moment.place}</div> : null}
                  <div>
                    {moment.artists.map((artist, index) => (
                      <span key={artist.slug}>
                        {index > 0 ? " · " : ""}
                        <Link href={`/artists/${artist.slug}`}>{artist.name}</Link>
                      </span>
                    ))}
                  </div>
                  {moment.slug ? <div><Link href={`/exhibitions/${moment.slug}`}>Explore this moment →</Link></div> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <PathList routes={routes} />

        {spaces.length > 0 ? (
          <section>
            <h2>Spaces</h2>
            <ul className="rh-list">
              {spaces.map((space) => (
                <li key={space.slug}>
                  <Link href={`/spaces/${space.slug}`}>{space.name}</Link>
                  <div>{space.count} documented exhibitions</div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
