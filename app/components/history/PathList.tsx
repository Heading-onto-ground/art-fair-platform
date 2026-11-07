"use client";

import Link from "next/link";
import JourneyContinueLink from "@/app/components/history/JourneyContinueLink";
import { trackHistory } from "@/lib/history/analytics";
import { pushRobEvent } from "@/lib/publicGrowth/analytics";
import { historyCopy, type HistoryLocale } from "@/lib/history/locale";
import { artistDisplayName } from "@/lib/history/names";
import { usePublicHref } from "@/app/components/history/LocaleUrl";

type Route = {
  id: string;
  artists: { slug: string; name: string; nativeName?: string | null }[];
  exhibitions: { slug: string | null; title: string; year: number | null }[];
};

export default function PathList({ routes, locale = "en" }: { routes: Route[]; locale?: HistoryLocale }) {
  const publicHref = usePublicHref();
  if (routes.length === 0) return null;
  const copy = historyCopy(locale);
  return (
    <section>
      <h2>{copy.paths}</h2>
      <p>{copy.followPath}</p>
      <ul className="rh-list">
        {routes.map((route) => (
          <li key={route.id} id={route.id}>
            <Link href={publicHref(`/history/explore#${route.id}`)} onClick={() => { trackHistory("PATH_OPENED", `/history/explore#${route.id}`); pushRobEvent("PATH_OPENED", { route: route.id }); }}>
              {copy.followPath}
            </Link>
            <div>
              {route.artists.map((artist, index) => {
                const bridge = index > 0 ? route.exhibitions[index - 1] : null;
                return (
                  <span key={`${route.id}-${artist.slug}`}>
                    {bridge ? ` ↓ ${bridge.year ?? ""} ${bridge.title} ↓ ` : ""}
                    <JourneyContinueLink slug={artist.slug} via={bridge?.slug ?? null} onClick={() => { trackHistory("PATH_STEP_OPENED", `/artists/${artist.slug}`); pushRobEvent("PATH_STEP_OPENED", { artist: artist.slug, route: route.id }); }}>
                      {artistDisplayName({ canonicalName: artist.name, nativeName: artist.nativeName, locale })}
                    </JourneyContinueLink>
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
