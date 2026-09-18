import type { WorkoutDayId } from "@silver-fox/types";
import type { WorkoutDay } from "../entities/workoutDay";

/**
 * Programmes rotate through their days in order rather than being pinned to
 * calendar days — there is no day-of-week scheduling (yet). "Today's
 * workout" is the day after the last one completed, wrapping back to the
 * first; with no history for this programme, it's simply the first day.
 */
export function selectNextWorkoutDay(
  days: WorkoutDay[],
  lastCompletedDayId: WorkoutDayId | null,
): WorkoutDay | null {
  if (days.length === 0) return null;
  const sorted = [...days].sort((a, b) => a.order - b.order);
  if (!lastCompletedDayId) return sorted[0] ?? null;

  const lastIndex = sorted.findIndex((day) => day.id === lastCompletedDayId);
  if (lastIndex === -1) return sorted[0] ?? null;

  return sorted[(lastIndex + 1) % sorted.length] ?? null;
}
