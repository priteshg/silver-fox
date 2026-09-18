import type { ExerciseId, ISODateString, WorkoutId } from "@silver-fox/types";
import type { Workout } from "../entities/workout";
import type { WorkoutSet } from "../entities/workoutSet";
import { estimateOneRepMax } from "./oneRepMax";
import { calculateTotalVolume } from "./volume";

export type PersonalRecordType = "weight" | "estimatedOneRepMax" | "repsAtWeight";

export interface PersonalRecord {
  exerciseId: ExerciseId;
  type: PersonalRecordType;
  /** Weight (kg), estimated 1RM (kg), or rep count, depending on `type`. */
  value: number;
  previousBest: number;
  /** Only set for `repsAtWeight` — the weight this rep record was set at. */
  atWeight?: number;
}

function estimatedOneRepMaxOf(set: Pick<WorkoutSet, "weight" | "reps">): number {
  return set.weight > 0 && set.reps > 0 ? estimateOneRepMax(set.weight, set.reps) : 0;
}

type MinimalSet = Pick<WorkoutSet, "exerciseId" | "weight" | "reps">;

/**
 * Finds personal records achieved in `newSets` by comparing against
 * `priorSets` (every set logged before this session). An exercise with no
 * prior sets is skipped entirely — there is nothing on record to beat yet,
 * so its first-ever sets are not reported as PRs.
 *
 * Takes only `exerciseId`/`weight`/`reps` — real `WorkoutSet[]` history
 * satisfies this, but so does a single just-completed set from an active
 * session that hasn't been persisted yet, which is what live in-workout PR
 * detection needs.
 */
export function findPersonalRecords(priorSets: MinimalSet[], newSets: MinimalSet[]): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  const exerciseIds = new Set(newSets.map((set) => set.exerciseId));

  for (const exerciseId of exerciseIds) {
    const priorForExercise = priorSets.filter((set) => set.exerciseId === exerciseId);
    if (priorForExercise.length === 0) continue;
    const newForExercise = newSets.filter((set) => set.exerciseId === exerciseId);

    const priorMaxWeight = Math.max(...priorForExercise.map((set) => set.weight));
    const newMaxWeight = Math.max(...newForExercise.map((set) => set.weight));
    if (newMaxWeight > priorMaxWeight) {
      records.push({ exerciseId, type: "weight", value: newMaxWeight, previousBest: priorMaxWeight });
    }

    const priorMaxOneRepMax = Math.max(...priorForExercise.map(estimatedOneRepMaxOf));
    const newMaxOneRepMax = Math.max(...newForExercise.map(estimatedOneRepMaxOf));
    if (priorMaxOneRepMax > 0 && newMaxOneRepMax > priorMaxOneRepMax) {
      records.push({
        exerciseId,
        type: "estimatedOneRepMax",
        value: Math.round(newMaxOneRepMax),
        previousBest: Math.round(priorMaxOneRepMax),
      });
    }

    const newMaxRepsByWeight = new Map<number, number>();
    for (const set of newForExercise) {
      newMaxRepsByWeight.set(set.weight, Math.max(newMaxRepsByWeight.get(set.weight) ?? 0, set.reps));
    }
    for (const [weight, reps] of newMaxRepsByWeight) {
      const priorAtWeight = priorForExercise.filter((set) => set.weight === weight);
      if (priorAtWeight.length === 0) continue;
      const priorMaxReps = Math.max(...priorAtWeight.map((set) => set.reps));
      if (reps > priorMaxReps) {
        records.push({
          exerciseId,
          type: "repsAtWeight",
          value: reps,
          previousBest: priorMaxReps,
          atWeight: weight,
        });
      }
    }
  }

  return records;
}

export interface CurrentRecords {
  heaviestWeight: number;
  bestEstimatedOneRepMax: number;
  bestSessionVolume: number;
}

/** The standing records for one exercise across all logged history, or null if it's never been logged. */
export function calculateCurrentRecords(sets: WorkoutSet[]): CurrentRecords | null {
  if (sets.length === 0) return null;

  const byWorkout = new Map<string, WorkoutSet[]>();
  for (const set of sets) {
    const list = byWorkout.get(set.workoutId) ?? [];
    list.push(set);
    byWorkout.set(set.workoutId, list);
  }

  return {
    heaviestWeight: Math.max(...sets.map((set) => set.weight)),
    bestEstimatedOneRepMax: Math.round(Math.max(...sets.map(estimatedOneRepMaxOf))),
    bestSessionVolume: Math.max(...Array.from(byWorkout.values()).map(calculateTotalVolume)),
  };
}

export interface RecentPersonalRecord {
  record: PersonalRecord;
  workoutId: WorkoutId;
  date: ISODateString;
}

/**
 * The most recent workout in which a genuine PR was set, newest first. Reuses
 * `findPersonalRecords` workout by workout — for each completed workout,
 * everything from strictly earlier workouts counts as "prior" — so this never
 * invents a PR the live in-workout banner or the summary screen wouldn't
 * also have flagged.
 */
export function findMostRecentPersonalRecord(workouts: Workout[], sets: WorkoutSet[]): RecentPersonalRecord | null {
  const completed = workouts
    .filter((workout): workout is Workout & { completedAt: ISODateString } => !!workout.completedAt)
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));

  for (let i = 0; i < completed.length; i++) {
    const workout = completed[i];
    if (!workout) continue;
    const thisSets = sets.filter((set) => set.workoutId === workout.id);
    if (thisSets.length === 0) continue;

    const earlierWorkoutIds = new Set(completed.slice(i + 1).map((w) => w.id));
    const priorSets = sets.filter((set) => earlierWorkoutIds.has(set.workoutId));
    const records = findPersonalRecords(priorSets, thisSets);
    const firstRecord = records[0];
    if (firstRecord) {
      return { record: firstRecord, workoutId: workout.id, date: workout.completedAt };
    }
  }
  return null;
}
