const ASSUMED_ACTIVE_SECONDS_PER_SET = 40;
const DEFAULT_REST_SECONDS = 90;

export interface DurationEstimateInput {
  targetSets: number;
  restSeconds?: number;
}

/**
 * Rough estimate of workout length in minutes, used before a workout starts
 * (once it's running, actual elapsed time is shown instead).
 *
 * Formula: for each exercise, (assumed active seconds per set + that
 * exercise's rest period) × target sets, summed across exercises. The active
 * time per set is a fixed assumption — set duration isn't tracked — while
 * rest comes from the exercise's configured `restSeconds` (defaulting to
 * 90s when unset).
 */
export function estimateWorkoutDurationMinutes(exercises: DurationEstimateInput[]): number {
  const totalSeconds = exercises.reduce((total, exercise) => {
    const restSeconds = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
    return total + exercise.targetSets * (ASSUMED_ACTIVE_SECONDS_PER_SET + restSeconds);
  }, 0);
  return Math.round(totalSeconds / 60);
}
