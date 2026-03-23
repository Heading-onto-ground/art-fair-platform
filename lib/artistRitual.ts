/**
 * Artist Ritual — shared data shape for web profile integration.
 *
 * Used by:
 * - GET /api/artist/public/[artistId]/ritual-summary (backend)
 * - ROB Web artist profile (future: display current streak, total posts, recent logs)
 *
 * Data flow:
 *   Artist Ritual Mobile → moments → ROB backend
 *   ROB Web profile ← GET /api/artist/public/[artistId]/ritual-summary
 */

export interface PracticeGraphDay {
  date: string; // YYYY-MM-DD
  count: number; // moments recorded that day
}

export interface ArtistRitualSummary {
  /** Consecutive days of practice (0 if broken or none) */
  currentStreak: number;
  /** Total number of ritual moments recorded */
  totalRitualPosts: number;
  /** Distinct days with at least one recorded moment */
  activeDays: number;
  /** Up to 5 most recent practice logs (date, state, medium) */
  recentPracticeLogs: RecentPracticeLog[];
  /** Last 90 days for practice graph (GitHub-style). Includes all days, count=0 for empty. */
  practiceGraphData: PracticeGraphDay[];
}

export interface RecentPracticeLog {
  id: string;
  date: string; // ISO date
  state: string;
  medium: string;
  imageUrl?: string | null;
}

/**
 * Calculate streak from moments (server-side, uses server timezone).
 * Same logic as mobile/utils/streak.ts.
 */
export function calculateStreakFromMoments(
  moments: { createdAt: Date }[]
): number {
  const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const dates = Array.from(
    new Set(moments.map((m) => toDateKey(new Date(m.createdAt))))
  ).sort()
    .reverse();

  if (dates.length === 0) return 0;

  const now = new Date();
  const today = toDateKey(now);
  const yesterday = toDateKey(new Date(now.getTime() - 86400000));

  if (!dates.includes(today) && !dates.includes(yesterday)) return 0;

  const startKey = dates.includes(today) ? today : yesterday;
  const [y, m, d] = startKey.split("-").map(Number);
  let check = new Date(y, m - 1, d);
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const key = toDateKey(check);
    if (dates.includes(key)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
