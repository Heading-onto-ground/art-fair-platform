const HISTORY_TABLES = [
  "ArtistEntity",
  "ArtistAlias",
  "ArtistEntityClaim",
  "HistoryParticipation",
  "ExhibitionHistoryMeta",
  "HistorySource",
  "ExhibitionSource",
  "HistorySignal",
  "SpaceSlug",
  "CuratorSlug",
  "HistoryUnresolvedName",
  "HistoryImportRecord",
];

export function isMissingHistorySchema(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code === "P2021" || code === "P2022") return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist/i.test(message) && HISTORY_TABLES.some((table) => message.includes(table));
}

export function isHistoryUnavailable(error: unknown): boolean {
  if (isMissingHistorySchema(error)) return true;
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code === "P1000" || code === "P1001" || code === "P1017") return true;
  }
  return false;
}
