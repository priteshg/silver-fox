import type { Exercise, ProgramExercise, User, Workout, WorkoutDay, WorkoutSet } from "@silver-fox/domain";
import type { ExerciseId, UserId, WorkoutId, WorkoutSetId } from "@silver-fox/types";
import { SEED_EXERCISES } from "../../data/seedExercises";
import {
  SEED_PROGRAM_EXERCISES,
  SEED_PROGRAM_ID,
  SEED_PROGRAMS,
  SEED_WORKOUT_DAYS,
} from "../../data/programmeCatalogue";
import type { ProgramDayDetail, ProgramDetail } from "../repositories/programRepository";

/**
 * Everything Demo shows is built from data that already exists as plain,
 * local TypeScript — the same Foundation 40+ catalogue and exercise
 * library the real app's seed data uses — joined together here with no
 * network call of any kind. This is deliberate: Demo must never create or
 * use a Supabase identity (see AUTH_AND_STATE_MODEL.md), and the simplest
 * way to guarantee that is for its data source to have no path to Supabase
 * at all, not just to avoid calling one today.
 */
const DEMO_USER_ID = "demo_user" as UserId;

function exerciseById(id: string): Exercise {
  const exercise = SEED_EXERCISES.find((e) => e.id === id);
  if (!exercise) throw new Error(`Demo data references an unknown exercise id: ${id}`);
  return exercise;
}

export const DEMO_PROGRAM_DETAIL: ProgramDetail = (() => {
  const program = SEED_PROGRAMS.find((p) => p.id === SEED_PROGRAM_ID);
  if (!program) throw new Error("Demo data could not find the Foundation 40+ catalogue programme.");

  const days: ProgramDayDetail[] = SEED_WORKOUT_DAYS.filter((day) => day.programId === SEED_PROGRAM_ID)
    .sort((a, b) => a.order - b.order)
    .map((day) => ({
      day,
      exercises: SEED_PROGRAM_EXERCISES.filter((pe) => pe.workoutDayId === day.id)
        .sort((a, b) => a.order - b.order)
        .map((pe) => ({ ...pe, exercise: exerciseById(pe.exerciseId) })),
    }));

  return { program, days };
})();

function findDay(name: string): WorkoutDay {
  const day = DEMO_PROGRAM_DETAIL.days.find((d) => d.day.name === name);
  if (!day) throw new Error(`Demo data expected a "${name}" day in the Foundation 40+ catalogue.`);
  return day.day;
}

export function findProgramExercise(dayName: string, exerciseId: string): ProgramExercise {
  const day = DEMO_PROGRAM_DETAIL.days.find((d) => d.day.name === dayName);
  const pe = day?.exercises.find((e) => e.exerciseId === exerciseId);
  if (!pe) throw new Error(`Demo data expected ${exerciseId} on "${dayName}" day.`);
  return pe;
}

const pushDay = findDay("Push");
const pullDay = findDay("Pull");
const legsDay = findDay("Legs");

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

interface FabricatedSet {
  exerciseId: ExerciseId;
  weight: number;
  reps: number;
  rir?: number;
}

interface FabricatedWorkout {
  id: string;
  day: WorkoutDay;
  daysAgo: number;
  sets: FabricatedSet[];
}

/**
 * Six sessions across roughly 2.5 weeks, rotating Push/Pull/Legs. Bench
 * Press's own numbers climb across its three appearances and the most
 * recent one lands every set at the top of its target rep range (6-10) at
 * the target RIR (2) — exactly the condition `suggestNextLoad` (see
 * packages/domain/src/logic/loadProgression.ts) reads as "ready to add
 * weight," so Demo's Progress view shows a genuine, live suggestion rather
 * than a fabricated one bolted on separately.
 */
const FABRICATED_WORKOUTS: FabricatedWorkout[] = [
  {
    id: "demo_workout_1",
    day: pushDay,
    daysAgo: 18,
    sets: [
      { exerciseId: "ex_bench_press" as ExerciseId, weight: 60, reps: 7, rir: 2 },
      { exerciseId: "ex_bench_press" as ExerciseId, weight: 60, reps: 7, rir: 2 },
      { exerciseId: "ex_bench_press" as ExerciseId, weight: 60, reps: 6, rir: 2 },
      { exerciseId: "ex_shoulder_press" as ExerciseId, weight: 17.5, reps: 10, rir: 2 },
      { exerciseId: "ex_shoulder_press" as ExerciseId, weight: 17.5, reps: 9, rir: 2 },
    ],
  },
  {
    id: "demo_workout_2",
    day: pullDay,
    daysAgo: 16,
    sets: [
      { exerciseId: "ex_lat_pulldown" as ExerciseId, weight: 45, reps: 8, rir: 2 },
      { exerciseId: "ex_lat_pulldown" as ExerciseId, weight: 45, reps: 8, rir: 2 },
      { exerciseId: "ex_chest_supported_row" as ExerciseId, weight: 22.5, reps: 10, rir: 2 },
    ],
  },
  {
    id: "demo_workout_3",
    day: legsDay,
    daysAgo: 14,
    sets: [
      { exerciseId: "ex_barbell_squat" as ExerciseId, weight: 70, reps: 8, rir: 3 },
      { exerciseId: "ex_barbell_squat" as ExerciseId, weight: 70, reps: 8, rir: 3 },
      { exerciseId: "ex_romanian_deadlift" as ExerciseId, weight: 60, reps: 8, rir: 2 },
    ],
  },
  {
    id: "demo_workout_4",
    day: pushDay,
    daysAgo: 11,
    sets: [
      { exerciseId: "ex_bench_press" as ExerciseId, weight: 62.5, reps: 8, rir: 2 },
      { exerciseId: "ex_bench_press" as ExerciseId, weight: 62.5, reps: 8, rir: 2 },
      { exerciseId: "ex_bench_press" as ExerciseId, weight: 62.5, reps: 7, rir: 2 },
      { exerciseId: "ex_lateral_raise" as ExerciseId, weight: 7.5, reps: 14, rir: 2 },
    ],
  },
  {
    id: "demo_workout_5",
    day: pullDay,
    daysAgo: 9,
    sets: [
      { exerciseId: "ex_lat_pulldown" as ExerciseId, weight: 47.5, reps: 8, rir: 2 },
      { exerciseId: "ex_face_pull" as ExerciseId, weight: 20, reps: 13, rir: 2 },
    ],
  },
  {
    id: "demo_workout_6",
    day: pushDay,
    daysAgo: 4,
    sets: [
      { exerciseId: "ex_bench_press" as ExerciseId, weight: 62.5, reps: 10, rir: 2 },
      { exerciseId: "ex_bench_press" as ExerciseId, weight: 62.5, reps: 10, rir: 2 },
      { exerciseId: "ex_bench_press" as ExerciseId, weight: 62.5, reps: 10, rir: 2 },
      { exerciseId: "ex_shoulder_press" as ExerciseId, weight: 20, reps: 10, rir: 2 },
      { exerciseId: "ex_tricep_pushdown" as ExerciseId, weight: 25, reps: 12, rir: 1 },
    ],
  },
];

export const DEMO_WORKOUTS: Workout[] = FABRICATED_WORKOUTS.map((w) => {
  const startedAt = daysAgoIso(w.daysAgo);
  return {
    id: w.id as WorkoutId,
    userId: DEMO_USER_ID,
    programId: SEED_PROGRAM_ID,
    workoutDayId: w.day.id,
    startedAt,
    completedAt: startedAt,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
});

export const DEMO_WORKOUT_SETS: WorkoutSet[] = FABRICATED_WORKOUTS.flatMap((w) => {
  const timestamp = daysAgoIso(w.daysAgo);
  return w.sets.map((set, index) => ({
    id: `${w.id}_set${index}` as WorkoutSetId,
    workoutId: w.id as WorkoutId,
    exerciseId: set.exerciseId,
    order: index,
    weight: set.weight,
    weightUnit: "kg" as const,
    reps: set.reps,
    rir: set.rir,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
});

/** A filled-in example profile, matching the level of detail a real, engaged user's would have. */
export const DEMO_PROFILE: User = {
  id: DEMO_USER_ID,
  displayName: "Alex",
  age: 46,
  preferredWeightUnit: "kg",
  trainingExperience: "intermediate",
  goals: ["strength_and_muscle", "longevity"],
  preferredTrainingDaysPerWeek: 3,
  availableEquipment: ["barbell", "dumbbell", "cable", "machine", "bodyweight"],
  activeProgramId: SEED_PROGRAM_ID,
  createdAt: daysAgoIso(18),
  updatedAt: daysAgoIso(4),
};
