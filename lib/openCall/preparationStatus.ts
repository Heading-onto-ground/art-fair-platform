export const PREPARATION_STATUSES = ["PLANNING", "PREPARING", "APPLIED", "RESULT_RECORDED"] as const;

export type PreparationStatus = (typeof PREPARATION_STATUSES)[number];

export const PREPARATION_DISCLAIMER_KO =
  "이 상태는 ROB에서 관리하는 개인 준비 기록이며, 실제 지원 접수 상태와는 다릅니다.";

const LABELS: Record<PreparationStatus, { ko: string; en: string }> = {
  PLANNING: { ko: "지원 예정", en: "Planning to apply" },
  PREPARING: { ko: "준비 중", en: "Preparing" },
  APPLIED: { ko: "지원 완료", en: "Marked as applied on the source" },
  RESULT_RECORDED: { ko: "결과 기록", en: "Result noted" },
};

export function parsePreparationStatus(value: unknown): PreparationStatus | null {
  const status = String(value || "").trim();
  return (PREPARATION_STATUSES as readonly string[]).includes(status) ? (status as PreparationStatus) : null;
}

export function preparationStatusLabel(status: PreparationStatus, lang: string) {
  const labels = LABELS[status];
  return lang === "ko" ? labels.ko : labels.en;
}

export function cleanPreparationNote(value: unknown) {
  if (typeof value !== "string") return null;
  const note = value.trim();
  return note ? note.slice(0, 500) : null;
}
