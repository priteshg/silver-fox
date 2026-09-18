import type { ISODateString } from "@silver-fox/types";
import type { StrengthFocus } from "../entities/workoutDay";

/**
 * The training week is read through six buckets rather than raw session
 * data — this is what a user actually wants to see at a glance. `strength`
 * only appears for a non-PPL day (a custom programme's full-body/other
 * focus); the flagship PPL programme only ever produces push/pull/legs.
 */
export type TrainingCategory = "push" | "pull" | "legs" | "upper" | "lower" | "strength" | "cardio" | "recovery" | "rest";

export interface WeekDayOverview {
  /** yyyy-mm-dd, UTC calendar day. */
  date: string;
  isToday: boolean;
  /** True for a day later this week that hasn't happened yet — shown blank, not as a rest day. */
  isFuture: boolean;
  category: TrainingCategory | null;
}

const FOCUS_TO_CATEGORY: Record<StrengthFocus, TrainingCategory> = {
  push: "push",
  pull: "pull",
  legs: "legs",
  upper: "upper",
  lower: "lower",
  full_body: "strength",
  other: "strength",
};

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function dateKeyToUTC(key: string): Date {
  const parts = key.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addUTCDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Builds the current Monday-to-Sunday week, categorising each day that has
 * already happened from whatever was logged for it, in priority order:
 * a completed strength workout, then a conditioning session, then a
 * mobility/recovery session, then rest. Days later this week are left
 * uncategorised rather than assumed to be rest, since nothing has
 * happened on them yet.
 */
export function buildWeeklyOverview(params: {
  referenceDate: Date;
  completedStrengthDays: { completedAt: ISODateString; focus: StrengthFocus }[];
  conditioningSessions: { date: ISODateString }[];
  mobilitySessions: { date: ISODateString }[];
}): WeekDayOverview[] {
  const { referenceDate, completedStrengthDays, conditioningSessions, mobilitySessions } = params;

  const todayKey = toDateKey(referenceDate.toISOString());
  const today = dateKeyToUTC(todayKey);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const monday = addUTCDays(today, -daysSinceMonday);

  const strengthByDate = new Map<string, TrainingCategory>();
  for (const day of completedStrengthDays) {
    strengthByDate.set(toDateKey(day.completedAt), FOCUS_TO_CATEGORY[day.focus]);
  }
  const cardioDates = new Set(conditioningSessions.map((session) => toDateKey(session.date)));
  const recoveryDates = new Set(mobilitySessions.map((session) => toDateKey(session.date)));

  const week: WeekDayOverview[] = [];
  for (let i = 0; i < 7; i++) {
    const key = toDateKey(addUTCDays(monday, i).toISOString());
    const isFuture = key > todayKey;
    const category = isFuture
      ? null
      : (strengthByDate.get(key) ?? (cardioDates.has(key) ? "cardio" : recoveryDates.has(key) ? "recovery" : "rest"));
    week.push({ date: key, isToday: key === todayKey, isFuture, category });
  }
  return week;
}
