import type { Workout } from "../entities/workout";
import type { WorkoutSet } from "../entities/workoutSet";
import { findPersonalRecords, type PersonalRecord } from "./personalRecords";
import { calculateTotalVolume } from "./volume";

export interface PreviousSessionComparison {
  totalVolume: number;
  totalSets: number;
}

export interface WorkoutSummary {
  durationMinutes: number;
  totalSets: number;
  totalVolume: number;
  exercisesCompleted: number;
  totalPlannedExercises: number;
  personalRecords: PersonalRecord[];
  previousSessionComparison: PreviousSessionComparison | null;
}

/**
 * Builds the post-workout summary from a just-finished workout. `priorSets`
 * must exclude this workout's own sets (everything logged before it) so PRs
 * are judged against real prior history. `previousSessionSets` — the sets
 * from the most recent earlier workout for the same programme day, if any —
 * drives the previous-session comparison.
 */
export function buildWorkoutSummary(params: {
  workout: Workout;
  sets: WorkoutSet[];
  totalPlannedExercises: number;
  priorSets: WorkoutSet[];
  previousSessionSets: WorkoutSet[] | null;
}): WorkoutSummary {
  const { workout, sets, totalPlannedExercises, priorSets, previousSessionSets } = params;

  const durationMinutes = workout.completedAt
    ? Math.max(
        1,
        Math.round(
          (new Date(workout.completedAt).getTime() - new Date(workout.startedAt).getTime()) / 60000,
        ),
      )
    : 0;

  return {
    durationMinutes,
    totalSets: sets.length,
    totalVolume: calculateTotalVolume(sets),
    exercisesCompleted: new Set(sets.map((set) => set.exerciseId)).size,
    totalPlannedExercises,
    personalRecords: findPersonalRecords(priorSets, sets),
    previousSessionComparison: previousSessionSets
      ? {
          totalVolume: calculateTotalVolume(previousSessionSets),
          totalSets: previousSessionSets.length,
        }
      : null,
  };
}
