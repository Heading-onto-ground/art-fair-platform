"use client";

import Link from "next/link";
import { trackHistory } from "@/lib/history/analytics";

type Route = {
  id: string;
  artists: { slug: string; name: string }[];
  exhibitions: { slug: string | null; title: string; year: number | null }[];
};

export default function PathList({ routes }: { routes: Route[] }) {
  if (routes.length === 0) return null;
  return (
    <section>
      <h2>Paths</h2>
      <p>Follow a documented path</p>
      <ul className="rh-list">
        {routes.map((route) => (
          <li key={route.id} id={route.id}>
            <Link href={`/history/explore#${route.id}`} onClick={() => trackHistory("PATH_OPENED", `/history/explore#${route.id}`)}>
              Follow a documented path
            </Link>
            <div>
              {route.artists.map((artist, index) => {
                const bridge = index > 0 ? route.exhibitions[index - 1] : null;
                return (
                  <span key={`${route.id}-${artist.slug}`}>
                    {bridge ? ` ↓ ${bridge.year ?? ""} ${bridge.title} ↓ ` : ""}
                    <Link href={`/artists/${artist.slug}`} onClick={() => trackHistory("PATH_STEP_OPENED", `/artists/${artist.slug}`)}>
                      {artist.name}
                    </Link>
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
