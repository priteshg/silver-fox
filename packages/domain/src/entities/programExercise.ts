import type { ExerciseId, ProgramExerciseId, Timestamped, WorkoutDayId } from "@silver-fox/types";

/** An exercise's prescribed placement and target within a WorkoutDay. */
export interface ProgramExercise extends Timestamped {
  id: ProgramExerciseId;
  workoutDayId: WorkoutDayId;
  exerciseId: ExerciseId;
  order: number;
  targetSets: number;
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
  targetRir?: number;
  /** Rest between sets, in seconds. */
  restSeconds?: number;
  /** Eccentric-pause-concentric-pause, e.g. "3-1-1-0". Not shown for warm-up-only or hold exercises. */
  tempo?: string;
  /** Sets performed before the working sets, not counted toward progression. RIR doesn't apply to these. */
  warmupSets?: number;
  /** A short coaching note specific to this exercise's placement in this programme. */
  notes?: string;
}
