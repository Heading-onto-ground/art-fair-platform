export type ArtworkPostType = "work" | "exhibition";

export type ArtworkItem = {
  id: string;
  title: string | null;
  caption: string | null;
  imageUrl: string;
  medium: string | null;
  postType: ArtworkPostType;
  isPublic: boolean;
  inPortfolio: boolean;
  seriesId: string | null;
  seriesTitle: string | null;
  hashtags: string[];
  createdAt: string;
};

export function parsePostType(value: unknown): ArtworkPostType {
  return value === "exhibition" ? "exhibition" : "work";
}

export const POST_TYPE_LABELS = {
  work: { ko: "작업", en: "Work" },
  exhibition: { ko: "전시", en: "Exhibition" },
} as const;
