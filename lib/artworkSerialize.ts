import type { ArtworkPostType } from "@/lib/artworkTypes";

export type ArtworkWithRelations = {
  id: string;
  title: string | null;
  caption: string | null;
  imageUrl: string;
  medium: string | null;
  postType: string;
  isPublic: boolean;
  inPortfolio: boolean;
  seriesId: string | null;
  createdAt: Date;
  updatedAt: Date;
  series?: { id: string; title: string } | null;
  artist?: {
    id: string;
    artistId: string;
    name: string;
    genre: string | null;
    country: string | null;
    city: string | null;
    profileImage: string | null;
  } | null;
};

export function serializeArtwork(
  a: ArtworkWithRelations,
  hashtags: string[] = [],
) {
  return {
    id: a.id,
    title: a.title,
    caption: a.caption,
    imageUrl: a.imageUrl,
    medium: a.medium,
    postType: (a.postType === "exhibition" ? "exhibition" : "work") as ArtworkPostType,
    isPublic: a.isPublic,
    inPortfolio: a.inPortfolio,
    seriesId: a.seriesId,
    seriesTitle: a.series?.title ?? null,
    hashtags,
    artist: a.artist
      ? {
          id: a.artist.id,
          artistId: a.artist.artistId,
          name: a.artist.name,
          genre: a.artist.genre,
          country: a.artist.country,
          city: a.artist.city,
          profileImage: a.artist.profileImage,
        }
      : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
