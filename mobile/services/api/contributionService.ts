import { API_BASE_URL } from "@/constants/api";

export type ContributionCategory = "profile" | "series" | "activity" | "exhibition" | "ritual";

export type ContributionItem = {
  id: string;
  category: ContributionCategory;
  labelKo: string;
  labelEn: string;
  points: number;
  count?: number;
};

export type ContributionResult = {
  total: number;
  level: number;
  levelLabelKo: string;
  levelLabelEn: string;
  nextMilestone: number | null;
  progressToNext: number;
  materialBenefitEligible: boolean;
  items: ContributionItem[];
  summary: Record<ContributionCategory, number>;
};

const CONTRIBUTION_URL = `${API_BASE_URL}/api/artist/contribution`;

export async function fetchContribution(): Promise<{
  ok: boolean;
  contribution?: ContributionResult;
  error?: string;
}> {
  const res = await fetch(CONTRIBUTION_URL, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({})) as {
    contribution?: ContributionResult;
    error?: string;
  };

  if (!res.ok) {
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  }

  return { ok: true, contribution: data.contribution };
}
