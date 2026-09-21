import {
  createId,
  type ExerciseId,
  type ProgramId,
  type UserId,
  type WeightUnit,
  type WorkoutDayId,
  type WorkoutId,
  type WorkoutSetId,
} from "@silver-fox/types";
import type { Workout } from "../entities/workout";
import type { WorkoutSet } from "../entities/workoutSet";
import type { SessionExercise, SessionExerciseConfig, SessionSet, WorkoutSession } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

export function createSession(params: {
  userId: UserId;
  programId?: ProgramId;
  workoutDayId?: WorkoutDayId;
  dayName: string;
  exercises: SessionExerciseConfig[];
}): WorkoutSession {
  return {
    id: createId("session") as WorkoutId,
    userId: params.userId,
    programId: params.programId,
    workoutDayId: params.workoutDayId,
    dayName: params.dayName,
    startedAt: nowIso(),
    exercises: params.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((config) => createSessionExercise(config)),
  };
}

function createSessionExercise(config: SessionExerciseConfig): SessionExercise {
  return {
    id: createId("sessionExercise"),
    exerciseId: config.exerciseId,
    programExerciseId: config.programExerciseId,
    order: config.order,
    targetRepRangeLow: config.targetRepRangeLow,
    targetRepRangeHigh: config.targetRepRangeHigh,
    targetRir: config.targetRir,
    restSeconds: config.restSeconds,
    tempo: config.tempo,
    sets: Array.from({ length: Math.max(config.targetSets, 1) }, (_, index) =>
      createEmptySet(index + 1),
    ),
  };
}

function createEmptySet(setNumber: number): SessionSet {
  return { id: createId("set"), setNumber, completed: false };
}

function mapExercise(
  session: WorkoutSession,
  sessionExerciseId: string,
  update: (exercise: SessionExercise) => SessionExercise,
): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((exercise) =>
      exercise.id === sessionExerciseId ? update(exercise) : exercise,
    ),
  };
}

export function addSet(session: WorkoutSession, sessionExerciseId: string): WorkoutSession {
  return mapExercise(session, sessionExerciseId, (exercise) => ({
    ...exercise,
    sets: [...exercise.sets, createEmptySet(exercise.sets.length + 1)],
  }));
}

export function removeSet(
  session: WorkoutSession,
  sessionExerciseId: string,
  sessionSetId: string,
): WorkoutSession {
  return mapExercise(session, sessionExerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets
      .filter((set) => set.id !== sessionSetId)
      .map((set, index) => ({ ...set, setNumber: index + 1 })),
  }));
}

export function completeSet(
  session: WorkoutSession,
  sessionExerciseId: string,
  sessionSetId: string,
  values: { weight: number; reps: number; rir?: number },
): WorkoutSession {
  return mapExercise(session, sessionExerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) =>
      set.id === sessionSetId ? { ...set, ...values, completed: true, completedAt: nowIso() } : set,
    ),
  }));
}

export function uncompleteSet(
  session: WorkoutSession,
  sessionExerciseId: string,
  sessionSetId: string,
): WorkoutSession {
  return mapExercise(session, sessionExerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) =>
      set.id === sessionSetId ? { ...set, completed: false, completedAt: undefined } : set,
    ),
  }));
}

export function updateExerciseTarget(
  session: WorkoutSession,
  sessionExerciseId: string,
  updates: Partial<
    Pick<SessionExercise, "targetRepRangeLow" | "targetRepRangeHigh" | "targetRir" | "restSeconds">
  >,
): WorkoutSession {
  return mapExercise(session, sessionExerciseId, (exercise) => ({ ...exercise, ...updates }));
}

/** Converts the completed sets of a session into persistable Workout + WorkoutSet records. */
export function finishSession(
  session: WorkoutSession,
  weightUnit: WeightUnit,
): { workout: Workout; sets: WorkoutSet[] } {
  const completedAt = nowIso();
  const workout: Workout = {
    id: session.id,
    userId: session.userId,
    programId: session.programId,
    workoutDayId: session.workoutDayId,
    startedAt: session.startedAt,
    completedAt,
    createdAt: session.startedAt,
    updatedAt: completedAt,
  };

  const sets: WorkoutSet[] = session.exercises.flatMap((exercise) =>
    exercise.sets
      .filter((set) => set.completed && set.weight !== undefined && set.reps !== undefined)
      .map((set) => ({
        id: createId("workoutSet") as WorkoutSetId,
        workoutId: workout.id,
        exerciseId: exercise.exerciseId,
        order: set.setNumber,
        weight: set.weight as number,
        weightUnit,
        reps: set.reps as number,
        rir: set.rir,
        createdAt: set.completedAt ?? completedAt,
        updatedAt: set.completedAt ?? completedAt,
      })),
  );

  return { workout, sets };
}

export function hasLoggedAnySet(session: WorkoutSession): boolean {
  return session.exercises.some((exercise) => exercise.sets.some((set) => set.completed));
}

/** Once a set is logged against a slot, swapping the exercise underneath it would mix two exercises' data into one history record — see EXERCISE_SUBSTITUTION_SPEC.md §7. */
export function canSubstituteExercise(exercise: SessionExercise): boolean {
  return !exercise.sets.some((set) => set.completed);
}

/**
 * Swaps which exercise a session slot is performing, without touching the
 * programme it came from — `programExerciseId` is untouched, and nothing
 * about a `ProgramExercise` is read or written here. `originalExerciseId` is
 * set only the first time, so re-substituting still remembers the exercise
 * the slot actually started as. No-ops once any set has been completed for
 * this slot (see `canSubstituteExercise`).
 */
export function substituteExercise(
  session: WorkoutSession,
  sessionExerciseId: string,
  newExerciseId: ExerciseId,
): WorkoutSession {
  return mapExercise(session, sessionExerciseId, (exercise) => {
    if (!canSubstituteExercise(exercise)) return exercise;
    return {
      ...exercise,
      originalExerciseId: exercise.originalExerciseId ?? exercise.exerciseId,
      exerciseId: newExerciseId,
    };
  });
}

/** Restores a slot to the exercise it started as, undoing any substitution made this session. */
export function revertSubstitution(session: WorkoutSession, sessionExerciseId: string): WorkoutSession {
  return mapExercise(session, sessionExerciseId, (exercise) => {
    if (!exercise.originalExerciseId || !canSubstituteExercise(exercise)) return exercise;
    return { ...exercise, exerciseId: exercise.originalExerciseId, originalExerciseId: undefined };
  });
}
