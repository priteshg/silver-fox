import type { Workout, WorkoutSet } from "@silver-fox/domain";
import type { ProgramId, UserId, WorkoutDayId, WorkoutId, WorkoutSetId } from "@silver-fox/types";
import { supabase } from "../supabase/client";

interface WorkoutRow {
  id: string;
  user_id: string;
  program_id: string | null;
  session_id: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkoutSetRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  order: number;
  weight: number;
  weight_unit: string;
  reps: number;
  rir: number | null;
  created_at: string;
  updated_at: string;
}

function workoutRowToDomain(row: WorkoutRow): Workout {
  return {
    id: row.id as WorkoutId,
    userId: row.user_id as UserId,
    programId: (row.program_id as ProgramId | null) ?? undefined,
    workoutDayId: (row.session_id as WorkoutDayId | null) ?? undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function workoutSetRowToDomain(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id as WorkoutSetId,
    workoutId: row.workout_id as WorkoutId,
    exerciseId: row.exercise_id as WorkoutSet["exerciseId"],
    order: row.order,
    weight: row.weight,
    weightUnit: row.weight_unit as WorkoutSet["weightUnit"],
    reps: row.reps,
    rir: row.rir ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWorkouts(): Promise<Workout[]> {
  const { data, error } = await supabase.from("workouts").select("*").order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(workoutRowToDomain);
}

export async function listWorkoutSets(): Promise<WorkoutSet[]> {
  const { data, error } = await supabase.from("workout_sets").select("*").order("order");
  if (error) throw error;
  return (data ?? []).map(workoutSetRowToDomain);
}

/**
 * Inserts the workout row and its sets as two separate requests — Supabase's
 * client doesn't expose a way to run both in one database transaction
 * without a server-side RPC function, which is more machinery than this
 * needs. Instead: if the sets insert fails after the workout insert
 * already succeeded, the just-inserted workout row is deleted before
 * re-throwing, so the observable end state is always either "both exist"
 * or "neither exists" — never a phantom, set-less "completed" workout
 * sitting in history. `finishSession` reuses the same workout id on every
 * call for a given session (see `packages/domain/src/session/session.ts`),
 * so this also makes a retry after a failure land on a clean slate instead
 * of colliding with a leftover row.
 */
export async function saveCompletedWorkout(workout: Workout, sets: WorkoutSet[]): Promise<void> {
  const { error: workoutError } = await supabase.from("workouts").insert({
    id: workout.id,
    user_id: workout.userId,
    program_id: workout.programId ?? null,
    session_id: workout.workoutDayId ?? null,
    started_at: workout.startedAt,
    completed_at: workout.completedAt ?? null,
    created_at: workout.createdAt,
    updated_at: workout.updatedAt,
  });
  if (workoutError) throw workoutError;

  if (sets.length) {
    const { error: setsError } = await supabase.from("workout_sets").insert(
      sets.map((set) => ({
        id: set.id,
        workout_id: set.workoutId,
        exercise_id: set.exerciseId,
        order: set.order,
        weight: set.weight,
        weight_unit: set.weightUnit,
        reps: set.reps,
        rir: set.rir ?? null,
        created_at: set.createdAt,
        updated_at: set.updatedAt,
      })),
    );
    if (setsError) {
      await supabase.from("workouts").delete().eq("id", workout.id);
      throw setsError;
    }
  }
}
