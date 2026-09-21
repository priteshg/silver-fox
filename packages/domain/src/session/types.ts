import type {
  ExerciseId,
  ISODateString,
  ProgramExerciseId,
  ProgramId,
  UserId,
  WorkoutDayId,
  WorkoutId,
} from "@silver-fox/types";

/** One working set within an active session. Undefined weight/reps means not logged yet. */
export interface SessionSet {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  rir?: number;
  completed: boolean;
  completedAt?: ISODateString;
}

/** One exercise's slice of an active session, including its editable-for-today target. */
export interface SessionExercise {
  id: string;
  exerciseId: ExerciseId;
  /** The exercise this slot started as, set once on the first substitution and kept stable across any later ones. Undefined until substituted. */
  originalExerciseId?: ExerciseId;
  programExerciseId?: ProgramExerciseId;
  order: number;
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
  targetRir?: number;
  restSeconds?: number;
  tempo?: string;
  sets: SessionSet[];
}

/** A workout in progress. Converted into a Workout + WorkoutSet[] once finished. */
export interface WorkoutSession {
  id: WorkoutId;
  userId: UserId;
  programId?: ProgramId;
  workoutDayId?: WorkoutDayId;
  dayName: string;
  startedAt: ISODateString;
  exercises: SessionExercise[];
}

export interface SessionExerciseConfig {
  exerciseId: ExerciseId;
  programExerciseId?: ProgramExerciseId;
  order: number;
  targetSets: number;
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
  targetRir?: number;
  restSeconds?: number;
  tempo?: string;
}
