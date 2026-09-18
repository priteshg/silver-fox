import type { Workout, WorkoutSet } from "@silver-fox/domain";
import { workoutSetsStorageSchema, workoutsStorageSchema } from "@silver-fox/validation";
import { readJson, writeJson } from "../storage/asyncStore";
import { STORAGE_KEYS } from "../storage/keys";

export async function listWorkouts(): Promise<Workout[]> {
  const raw = await readJson(STORAGE_KEYS.workouts);
  if (raw === null) return [];
  const parsed = workoutsStorageSchema.safeParse(raw);
  return parsed.success ? (parsed.data as Workout[]) : [];
}

export async function listWorkoutSets(): Promise<WorkoutSet[]> {
  const raw = await readJson(STORAGE_KEYS.workoutSets);
  if (raw === null) return [];
  const parsed = workoutSetsStorageSchema.safeParse(raw);
  return parsed.success ? (parsed.data as WorkoutSet[]) : [];
}

export async function saveCompletedWorkout(workout: Workout, sets: WorkoutSet[]): Promise<void> {
  const [workouts, existingSets] = await Promise.all([listWorkouts(), listWorkoutSets()]);
  await Promise.all([
    writeJson(STORAGE_KEYS.workouts, [...workouts, workout]),
    writeJson(STORAGE_KEYS.workoutSets, [...existingSets, ...sets]),
  ]);
}
