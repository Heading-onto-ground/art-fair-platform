export function normalizeOpportunityText(value?: string | null) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9가-힣]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function hostOf(url?: string | null) {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function opportunityFingerprint(input: {
  organizerName?: string | null;
  title: string;
  deadline?: string | null;
  officialUrl?: string | null;
  sourceUrl?: string | null;
}) {
  const host = hostOf(input.officialUrl) || hostOf(input.sourceUrl);
  return [
    normalizeOpportunityText(input.organizerName),
    normalizeOpportunityText(input.title),
    String(input.deadline || "").trim(),
    host,
  ].join("|");
}

export function opportunityCycleKey(input: {
  organizerName?: string | null;
  title: string;
  deadline?: string | null;
}) {
  const organizer = normalizeOpportunityText(input.organizerName);
  if (!organizer) return null;
  return [
    organizer,
    normalizeOpportunityText(input.title),
    String(input.deadline || "").trim(),
  ].join("|");
}
