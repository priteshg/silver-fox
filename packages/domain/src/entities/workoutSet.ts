import type {
  ExerciseId,
  Timestamped,
  WeightUnit,
  WorkoutId,
  WorkoutSetId,
} from "@silver-fox/types";

export interface WorkoutSet extends Timestamped {
  id: WorkoutSetId;
  workoutId: WorkoutId;
  exerciseId: ExerciseId;
  order: number;
  weight: number;
  weightUnit: WeightUnit;
  reps: number;
  /** Reps in reserve, i.e. how many more reps could have been done. */
  rir?: number;
}
