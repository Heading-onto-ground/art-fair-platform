import { classifyCandidateLabel, type ExpansionGraph } from "@/lib/history/expansionCandidates";
import { componentMembership } from "@/lib/history/growth";
import { expansionSnapshot } from "@/lib/history/expansionGraphValue";
import { densityForCount } from "@/lib/history/policy";

/**
 * A public exhibition is a display frontier when it contains an unresolved
 * label, a sparse artist, two or more existing artists, or artists who are
 * not yet in one component. That count describes the graph. It is not a
 * research queue: a group of history-ready artists is not actionable.
 * Actionable frontiers need a person-like unresolved participant, a sparse
 * artist, or a real cross-component link. Unresearched archive pages are
 * counted separately as new exhibition targets.
 */

export type ExhibitionFrontier = {
  exhibitionId: string;
  title: string;
  year: number | null;
  space: string | null;
  existingArtistSlugs: string[];
  unresolvedLabels: string[];
  sparseArtistSlugs: string[];
  componentIds: number[];
  connectsComponents: boolean;
};

export function exhibitionFrontiers(graph: ExpansionGraph): ExhibitionFrontier[] {
  const membership = componentMembership(expansionSnapshot(graph));
  const sparse = new Set(
    graph.artists
      .filter((artist) => {
        const density = densityForCount(artist.exhibitionIds.length);
        return density === "EMPTY" || density === "LOW_DENSITY";
      })
      .map((artist) => artist.slug),
  );
  const unresolvedByExhibition = new Map<string, string[]>();
  for (const row of graph.unresolved) {
    if (!row.exhibitionId) continue;
    const list = unresolvedByExhibition.get(row.exhibitionId) ?? [];
    if (!list.includes(row.label)) list.push(row.label);
    unresolvedByExhibition.set(row.exhibitionId, list);
  }
  const frontiers: ExhibitionFrontier[] = [];
  for (const exhibition of graph.exhibitions) {
    const existing = [...new Set(exhibition.artistSlugs)];
    const unresolved = unresolvedByExhibition.get(exhibition.id) ?? [];
    const sparseArtistSlugs = existing.filter((slug) => sparse.has(slug));
    const componentIds = [...new Set(existing.map((slug) => membership.get(slug)?.id).filter((id): id is number => id != null))].sort((left, right) => left - right);
    const connectsComponents = componentIds.length >= 2;
    if (unresolved.length === 0 && sparseArtistSlugs.length === 0 && existing.length < 2 && !connectsComponents) continue;
    frontiers.push({
      exhibitionId: exhibition.id,
      title: exhibition.title,
      year: exhibition.year,
      space: exhibition.space,
      existingArtistSlugs: existing,
      unresolvedLabels: unresolved,
      sparseArtistSlugs,
      componentIds,
      connectsComponents,
    });
  }
  return frontiers.sort((left, right) =>
    right.unresolvedLabels.length - left.unresolvedLabels.length
    || right.existingArtistSlugs.length - left.existingArtistSlugs.length
    || left.title.localeCompare(right.title));
}

export function isActionableFrontier(frontier: ExhibitionFrontier): boolean {
  const personLike = frontier.unresolvedLabels.some((label) => classifyCandidateLabel(label) === "PERSON_LIKE");
  return personLike || frontier.sparseArtistSlugs.length > 0 || frontier.connectsComponents;
}

export function actionableFrontiers(graph: ExpansionGraph): ExhibitionFrontier[] {
  return exhibitionFrontiers(graph).filter(isActionableFrontier);
}
