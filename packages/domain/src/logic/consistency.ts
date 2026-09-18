import type { ISODateString } from "@silver-fox/types";

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function dateKeyToUTC(key: string): Date {
  const parts = key.split("-").map(Number);
  return new Date(Date.UTC(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1));
}

function mondayKeyOf(date: Date): string {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return toDateKey(monday.toISOString());
}

function addWeeks(key: string, weeks: number): string {
  const date = dateKeyToUTC(key);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return toDateKey(date.toISOString());
}

/**
 * Consecutive weeks (Monday-Sunday) with at least one completed workout,
 * counting back from the week containing `referenceDate`. A week still in
 * progress with nothing logged yet doesn't break the streak — only a week
 * that's fully passed with zero sessions does.
 */
export function calculateWeeklyStreak(completedAtDates: ISODateString[], referenceDate: Date): number {
  const trainedWeeks = new Set(completedAtDates.map((iso) => mondayKeyOf(new Date(iso))));

  let cursor = mondayKeyOf(referenceDate);
  if (!trainedWeeks.has(cursor)) {
    cursor = addWeeks(cursor, -1);
  }

  let streak = 0;
  while (trainedWeeks.has(cursor)) {
    streak++;
    cursor = addWeeks(cursor, -1);
  }
  return streak;
}

/** How many distinct Monday-Sunday weeks have at least one completed workout. */
export function countDistinctTrainedWeeks(completedAtDates: ISODateString[]): number {
  return new Set(completedAtDates.map((iso) => mondayKeyOf(new Date(iso)))).size;
}
