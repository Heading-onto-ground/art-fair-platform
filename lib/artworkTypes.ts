export type ArtworkPostType = "work" | "exhibition";

export function parsePostType(value: unknown): ArtworkPostType {
  return value === "exhibition" ? "exhibition" : "work";
}

export const POST_TYPE_LABELS = {
  work: { ko: "작업", en: "Work" },
  exhibition: { ko: "전시", en: "Exhibition" },
} as const;
