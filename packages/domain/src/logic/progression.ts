import type { ExerciseId } from "@silver-fox/types";
import type { Workout } from "../entities/workout";
import type { WorkoutSet } from "../entities/workoutSet";
import { estimateOneRepMax } from "./oneRepMax";
import { calculateTotalVolume } from "./volume";

export interface ExerciseSessionSummary {
  workoutId: string;
  /** ISO date the session happened on (completion time, falling back to start time). */
  date: string;
  sets: WorkoutSet[];
  totalVolume: number;
  topWeight: number;
  topWeightReps: number;
  /** 0 when the top set had no weight (e.g. an unweighted bodyweight set). */
  estimatedOneRepMax: number;
}

/** Per-exercise history across workouts, newest first. */
export function summarizeExerciseHistory(
  workouts: Workout[],
  sets: WorkoutSet[],
  exerciseId: ExerciseId,
): ExerciseSessionSummary[] {
  const setsByWorkout = new Map<string, WorkoutSet[]>();
  for (const set of sets) {
    if (set.exerciseId !== exerciseId) continue;
    const list = setsByWorkout.get(set.workoutId) ?? [];
    list.push(set);
    setsByWorkout.set(set.workoutId, list);
  }

  const summaries: ExerciseSessionSummary[] = [];
  for (const workout of workouts) {
    const workoutSets = setsByWorkout.get(workout.id);
    if (!workoutSets || workoutSets.length === 0) continue;

    const sortedSets = [...workoutSets].sort((a, b) => a.order - b.order);
    const topSet = sortedSets.reduce((best, set) => (set.weight > best.weight ? set : best));

    summaries.push({
      workoutId: workout.id,
      date: workout.completedAt ?? workout.startedAt,
      sets: sortedSets,
      totalVolume: calculateTotalVolume(sortedSets),
      topWeight: topSet.weight,
      topWeightReps: topSet.reps,
      estimatedOneRepMax:
        topSet.weight > 0 && topSet.reps > 0
          ? Math.round(estimateOneRepMax(topSet.weight, topSet.reps))
          : 0,
    });
  }

  return summaries.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPreviousPerformance(
  workouts: Workout[],
  sets: WorkoutSet[],
  exerciseId: ExerciseId,
): ExerciseSessionSummary | null {
  return summarizeExerciseHistory(workouts, sets, exerciseId)[0] ?? null;
}
