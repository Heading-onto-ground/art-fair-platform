export type PathArtist = { slug: string; name: string };

export type PathShow = {
  id: string;
  slug: string | null;
  title: string;
  year: number | null;
  artists: PathArtist[];
};

export type DocumentedPath = {
  id: string;
  artists: PathArtist[];
  exhibitions: { slug: string | null; title: string; year: number | null }[];
};

function uniqueArtists(artists: PathArtist[]): PathArtist[] {
  const seen = new Set<string>();
  const rows: PathArtist[] = [];
  for (const artist of artists) {
    if (!artist.slug || seen.has(artist.slug)) continue;
    seen.add(artist.slug);
    rows.push(artist);
  }
  return rows;
}

export function buildDocumentedPaths(shows: PathShow[], limit = 6): DocumentedPath[] {
  const bridges = shows
    .map((show) => ({ ...show, artists: uniqueArtists(show.artists) }))
    .filter((show) => show.artists.length >= 2);
  const found: DocumentedPath[] = [];
  const seen = new Set<string>();
  for (const left of bridges) {
    for (const right of bridges) {
      if (left.id === right.id) continue;
      const middles = left.artists.filter((artist) => right.artists.some((other) => other.slug === artist.slug));
      if (middles.length !== 1) continue;
      const middle = middles[0];
      const starts = left.artists.filter((artist) => artist.slug !== middle.slug).slice(0, 3);
      const ends = right.artists.filter((artist) => artist.slug !== middle.slug).slice(0, 3);
      for (const start of starts) {
        for (const end of ends) {
          if (start.slug === end.slug) continue;
          const chronological = left.year != null && right.year != null && left.year > right.year;
          const artists = chronological ? [end, middle, start] : [start, middle, end];
          const exhibitions = chronological
            ? [right, left].map((show) => ({ slug: show.slug, title: show.title, year: show.year }))
            : [left, right].map((show) => ({ slug: show.slug, title: show.title, year: show.year }));
          const id = `${artists.map((artist) => artist.slug).join(">")}@${exhibitions.map((show) => show.slug || show.title).join(">")}`;
          if (seen.has(id)) continue;
          seen.add(id);
          found.push({ id, artists, exhibitions });
        }
      }
    }
  }
  found.sort((left, right) => (left.exhibitions[0]?.year ?? 9999) - (right.exhibitions[0]?.year ?? 9999) || left.id.localeCompare(right.id));
  return found.slice(0, limit);
}

/** Prefer paths that start from different artists, pass through different artists, and begin in different decades. */
export function selectDiversePaths(routes: DocumentedPath[], limit = 6): DocumentedPath[] {
  const pool = [...routes];
  const picked: DocumentedPath[] = [];
  const starts = new Set<string>();
  const middles = new Set<string>();
  const decades = new Set<number>();
  while (picked.length < limit && pool.length > 0) {
    let bestIndex = 0;
    let bestScore = -1;
    pool.forEach((route, index) => {
      const start = route.artists[0]?.slug;
      const middle = route.artists[1]?.slug;
      const year = route.exhibitions[0]?.year;
      const decade = year == null ? null : Math.floor(year / 10) * 10;
      let score = 0;
      if (start && !starts.has(start)) score += 4;
      if (middle && !middles.has(middle)) score += 2;
      if (decade != null && !decades.has(decade)) score += 1;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    const [choice] = pool.splice(bestIndex, 1);
    if (!choice) break;
    picked.push(choice);
    if (choice.artists[0]?.slug) starts.add(choice.artists[0].slug);
    if (choice.artists[1]?.slug) middles.add(choice.artists[1].slug);
    const year = choice.exhibitions[0]?.year;
    if (year != null) decades.add(Math.floor(year / 10) * 10);
  }
  return picked;
}
