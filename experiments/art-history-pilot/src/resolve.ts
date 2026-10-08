export type ResolutionState =
  | "EXACT_MATCH"
  | "HIGH_CONFIDENCE_CANDIDATE"
  | "REVIEW_REQUIRED"
  | "DISTINCT";

export type EntityKind = "artist" | "space" | "curator" | "exhibition";

export type EntityRef = {
  kind: EntityKind;
  name: string;
  aliases?: string[];
  birthYear?: number | null;
  qid?: string | null;
  city?: string | null;
  branch?: string | null;
};

export type MergeDecision = {
  state: ResolutionState;
  merge: boolean;
  authority: "AUTHORITATIVE_ID" | "HUMAN_APPROVAL" | null;
};

export function compactName(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9\uac00-\ud7a3]/g, "");
}

export function tokenKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^a-z0-9\uac00-\ud7a3]+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function labels(entity: EntityRef): string[] {
  return [entity.name, ...(entity.aliases ?? [])];
}

export function namesMatch(left: EntityRef, right: EntityRef): boolean {
  const leftCompact = labels(left).map(compactName);
  const rightCompact = labels(right).map(compactName);
  if (leftCompact.some((name) => name && rightCompact.includes(name))) return true;
  const leftTokens = labels(left).map(tokenKey);
  const rightTokens = labels(right).map(tokenKey);
  return leftTokens.some((name) => name && rightTokens.includes(name));
}

export function classifyPair(left: EntityRef, right: EntityRef): ResolutionState {
  if (left.kind !== right.kind) return "DISTINCT";
  if (left.qid && right.qid && left.qid === right.qid) return "EXACT_MATCH";
  if (left.qid && right.qid && left.qid !== right.qid) return "DISTINCT";

  if (left.kind === "space") return classifySpace(left, right);
  return classifyPerson(left, right);
}

function classifyPerson(left: EntityRef, right: EntityRef): ResolutionState {
  const leftBirth = left.birthYear ?? null;
  const rightBirth = right.birthYear ?? null;
  if (leftBirth !== null && rightBirth !== null && leftBirth !== rightBirth) return "DISTINCT";
  if (!namesMatch(left, right)) return "DISTINCT";
  if (leftBirth !== null && rightBirth !== null && leftBirth === rightBirth) {
    return "HIGH_CONFIDENCE_CANDIDATE";
  }
  return "REVIEW_REQUIRED";
}

function classifySpace(left: EntityRef, right: EntityRef): ResolutionState {
  if (!namesMatch(left, right)) return "DISTINCT";
  if (left.branch && right.branch && compactName(left.branch) !== compactName(right.branch)) {
    return "DISTINCT";
  }
  if (left.city && right.city && compactName(left.city) !== compactName(right.city)) {
    return "DISTINCT";
  }
  const samePlace =
    Boolean(left.city && right.city) &&
    (!left.branch || !right.branch || compactName(left.branch) === compactName(right.branch));
  return samePlace ? "HIGH_CONFIDENCE_CANDIDATE" : "REVIEW_REQUIRED";
}

export function decideMerge(state: ResolutionState, humanApproved = false): MergeDecision {
  if (state === "EXACT_MATCH") {
    return { state, merge: true, authority: "AUTHORITATIVE_ID" };
  }
  if (humanApproved && (state === "HIGH_CONFIDENCE_CANDIDATE" || state === "REVIEW_REQUIRED")) {
    return { state, merge: true, authority: "HUMAN_APPROVAL" };
  }
  return { state, merge: false, authority: null };
}
