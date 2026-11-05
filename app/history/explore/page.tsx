import Link from "next/link";
import JourneyContinueLink from "@/app/components/history/JourneyContinueLink";
import TopBar from "@/app/components/TopBar";
import ExploreTrack from "@/app/components/history/ExploreTrack";
import LocaleSwitch from "@/app/components/history/LocaleSwitch";
import PathList from "@/app/components/history/PathList";
import { listExplore } from "@/lib/history/queries";
import { historyCopy } from "@/lib/history/locale";
import { historyLocale, pinnedLocale, pinnedPath } from "@/lib/history/requestLocale";
import { pageMetadata } from "@/lib/seo";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import "@/app/components/history/history.css";

export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";
export const runtime = "nodejs";

export function generateMetadata() {
  const locale = historyLocale();
  const ko = locale === "ko";
  return pageMetadata({
    title: ko ? "예술 세계 둘러보기 | ROB" : "Explore the art world | ROB",
    description: ko
      ? "기록된 작가, 전시, 공간과 그 접점을 둘러봅니다."
      : "Browse documented artists, exhibitions, spaces, and the connections between them.",
    path: "/history/explore",
    localeUrl: pinnedLocale(),
  });
}

export default async function HistoryExplorePage() {
  const locale = historyLocale();
  const copy = historyCopy(locale);
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
      <TopBar locale={locale} />
      <ExploreTrack />
      <main className="rh-wrap">
        <LocaleSwitch locale={locale} />
        <p className="rh-kicker">{copy.explore}</p>
        <h1 className="rh-title">{copy.exploreWorld}</h1>
        {unavailable ? <p>{copy.noExhibitions}</p> : null}

        {artists.length > 0 ? (
          <section>
            <h2>{copy.journeys}</h2>
            <ul className="rh-list">
              {artists.map((artist) => (
                <li key={artist.slug}>
                  <JourneyContinueLink slug={artist.slug}>{artist.canonicalName}</JourneyContinueLink>
                  {artist.nativeName ? ` ${artist.nativeName}` : ""}
                  <div>
                    {artist.firstYear && artist.lastYear ? `${artist.firstYear}–${artist.lastYear} · ` : ""}
                    {copy.documentedLine(artist.exhibitionCount)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {moments.length > 0 ? (
          <section>
            <h2>{copy.moments}</h2>
            <ul className="rh-list">
              {moments.map((moment) => (
                <li key={moment.id}>
                  <div>{moment.year ?? copy.yearNotRecorded}</div>
                  {moment.slug ? <Link href={pinnedPath(`/exhibitions/${moment.slug}`)}>{moment.title}</Link> : <strong>{moment.title}</strong>}
                  {moment.place ? <div>{moment.place}</div> : null}
                  <div>
                    {moment.artists.map((artist, index) => (
                      <span key={artist.slug}>
                        {index > 0 ? " · " : ""}
                        <JourneyContinueLink slug={artist.slug} via={moment.slug}>{artist.name}</JourneyContinueLink>
                      </span>
                    ))}
                  </div>
                  {moment.slug ? <div><Link href={pinnedPath(`/exhibitions/${moment.slug}`)}>{copy.exploreMoment} →</Link></div> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <PathList routes={routes} locale={locale} />

        {spaces.length > 0 ? (
          <section>
            <h2>{copy.spaces}</h2>
            <ul className="rh-list">
              {spaces.map((space) => (
                <li key={space.slug}>
                  <Link href={pinnedPath(`/spaces/${space.slug}`)}>{space.name}</Link>
                  <div>{copy.documentedLine(space.count)}</div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
