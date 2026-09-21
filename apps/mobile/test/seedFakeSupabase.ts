import { SEED_EXERCISES } from "../data/seedExercises";
import { SEED_PROGRAM_EXERCISES, SEED_PROGRAMS, SEED_WORKOUT_DAYS } from "../data/programmeCatalogue";
import { dayToRow, programExerciseToRow, programToRow } from "../lib/repositories/programMappers";
import { exerciseToRow } from "../lib/repositories/exerciseMappers";
import type { FakeDb, FakeRow } from "./fakeSupabase";

function asFakeRows<T extends object>(rows: T[]): FakeRow[] {
  return rows as unknown as FakeRow[];
}

/**
 * Populates the fake Supabase db with the same built-in exercise library and
 * programme catalogue that `supabase/seed.sql` loads into a real project, so
 * component/repository tests see the same starting data a freshly seeded
 * dev database would have — instead of each test re-deriving its own
 * fixture rows by hand.
 */
export function seedFakeCatalogue(db: FakeDb): void {
  db.exercises = asFakeRows(SEED_EXERCISES.map(exerciseToRow));
  db.exercise_substitutions = SEED_EXERCISES.flatMap((exercise) =>
    (exercise.substitutionExerciseIds ?? []).map((substituteExerciseId) => ({
      exercise_id: exercise.id as string,
      substitute_exercise_id: substituteExerciseId as string,
    })),
  );
  db.programs = asFakeRows(SEED_PROGRAMS.map(programToRow));
  db.program_sessions = asFakeRows(SEED_WORKOUT_DAYS.map(dayToRow));
  db.program_exercises = asFakeRows(SEED_PROGRAM_EXERCISES.map(programExerciseToRow));
}
