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
      const start = left.artists.find((artist) => artist.slug !== middle.slug);
      const end = right.artists.find((artist) => artist.slug !== middle.slug && artist.slug !== start?.slug);
      if (!start || !end) continue;
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
  found.sort((left, right) => (left.exhibitions[0]?.year ?? 9999) - (right.exhibitions[0]?.year ?? 9999) || left.id.localeCompare(right.id));
  return found.slice(0, limit);
}
