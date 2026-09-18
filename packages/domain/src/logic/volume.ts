import type { WorkoutSet } from "../entities/workoutSet";

/** Volume of a single set: weight lifted times reps performed. */
export function calculateSetVolume(set: Pick<WorkoutSet, "weight" | "reps">): number {
  return set.weight * set.reps;
}

/** Total volume across a collection of sets, e.g. one workout or one exercise. */
export function calculateTotalVolume(sets: Pick<WorkoutSet, "weight" | "reps">[]): number {
  return sets.reduce((total, set) => total + calculateSetVolume(set), 0);
}
