/**
 * Streak calculation for Artist Ritual.
 *
 * Rules:
 * - Streak = consecutive days the user recorded at least one moment
 * - Count backwards from today (or yesterday if nothing today)
 * - A "day" is in local timezone (start of day)
 * - Missed day = streak broken
 *
 * Example: User recorded on Mon, Tue, Wed. Today is Thu.
 * - If they recorded today: streak = 4
 * - If not: streak = 3 (Mon, Tue, Wed)
 */

import type { ArtistMoment } from "@/types";

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get unique calendar dates (YYYY-MM-DD) when user recorded, sorted newest first.
 */
export function getRecordedDates(moments: ArtistMoment[]): string[] {
  const set = new Set<string>();
  for (const m of moments) {
    const d = new Date(m.createdAt);
    set.add(toDateKey(d));
  }
  return Array.from(set).sort().reverse();
}

/**
 * Check if user recorded today (local timezone).
 */
export function hasRecordedToday(moments: ArtistMoment[]): boolean {
  const today = toDateKey(new Date());
  return getRecordedDates(moments).includes(today);
}

/**
 * Calculate current consecutive streak.
 * Returns 0 if no moments or streak broken.
 */
export function calculateStreak(moments: ArtistMoment[]): number {
  const dates = getRecordedDates(moments);
  if (dates.length === 0) return 0;

  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 86400000));

  // Streak must include today or yesterday (we count from most recent activity)
  if (!dates.includes(today) && !dates.includes(yesterday)) {
    // No recent activity - streak is broken
    return 0;
  }

  // Start from today or yesterday (whichever is most recent with a record)
  let startDate: Date;
  if (dates.includes(today)) {
    startDate = parseDateKey(today);
  } else {
    startDate = parseDateKey(yesterday);
  }

  let streak = 0;
  let check = new Date(startDate);

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

/**
 * Returns a short milestone message for the given streak, or null if none applies.
 * Calm, artist-focused tone. No gamification.
 */
export function getStreakMilestoneMessage(streak: number): string | null {
  if (streak <= 0) return null;
  if (streak >= 30) return "30-day practice streak";
  if (streak >= 7) return "7-day practice streak";
  if (streak >= 3) return "3-day practice streak";
  return null;
}

/** Micro milestone for post-record (Day 1, 3, 7, 30). */
export function getMicroMilestone(streak: number): string {
  if (streak >= 30) return "A month of showing up.";
  if (streak >= 7) return "One week of practice.";
  if (streak >= 3) return "You're building a ritual.";
  if (streak >= 1) return "You started.";
  return "You showed up today.";
}

/**
 * Ritual Call: 9 PM (21:00) local.
 * Active: within 30 min of call (21:00~21:30) or before call (early).
 * Late: 21:31~midnight (responded after the window).
 */
const RITUAL_CALL_HOUR = 21;
const RITUAL_CALL_WINDOW_MINUTES = 30;

export type RitualStatus = "active" | "late" | "missed";

/**
 * Get today's ritual status: Active Artist 🔥, Late Artist 🕒, or Missed Ritual ❌.
 * Active: recorded before 21:31 (early or within 30 min of 9 PM call).
 * Late: recorded 21:31~midnight.
 */
export function getRitualStatus(moments: ArtistMoment[]): RitualStatus {
  const today = toDateKey(new Date());
  const todayMoments = moments
    .filter((m) => toDateKey(new Date(m.createdAt)) === today)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (todayMoments.length === 0) return "missed";

  const firstRecorded = new Date(todayMoments[0].createdAt);
  const hour = firstRecorded.getHours();
  const min = firstRecorded.getMinutes();
  const minutesSinceMidnight = hour * 60 + min;
  const callEndMinutes = RITUAL_CALL_HOUR * 60 + RITUAL_CALL_WINDOW_MINUTES; // 21:30

  if (minutesSinceMidnight < callEndMinutes) return "active";
  return "late";
}
