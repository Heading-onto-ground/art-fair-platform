"use client";

import Link from "next/link";
import JourneyContinueLink from "@/app/components/history/JourneyContinueLink";
import { trackHistory } from "@/lib/history/analytics";
import { historyCopy, type HistoryLocale } from "@/lib/history/locale";

type Route = {
  id: string;
  artists: { slug: string; name: string }[];
  exhibitions: { slug: string | null; title: string; year: number | null }[];
};

export default function PathList({ routes, locale = "en" }: { routes: Route[]; locale?: HistoryLocale }) {
  if (routes.length === 0) return null;
  const copy = historyCopy(locale);
  return (
    <section>
      <h2>{copy.paths}</h2>
      <p>{copy.followPath}</p>
      <ul className="rh-list">
        {routes.map((route) => (
          <li key={route.id} id={route.id}>
            <Link href={`/history/explore#${route.id}`} onClick={() => trackHistory("PATH_OPENED", `/history/explore#${route.id}`)}>
              {copy.followPath}
            </Link>
            <div>
              {route.artists.map((artist, index) => {
                const bridge = index > 0 ? route.exhibitions[index - 1] : null;
                return (
                  <span key={`${route.id}-${artist.slug}`}>
                    {bridge ? ` ↓ ${bridge.year ?? ""} ${bridge.title} ↓ ` : ""}
                    <JourneyContinueLink slug={artist.slug} via={bridge?.slug ?? null} onClick={() => trackHistory("PATH_STEP_OPENED", `/artists/${artist.slug}`)}>
                      {artist.name}
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
