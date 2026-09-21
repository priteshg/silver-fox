import type { Exercise } from "@silver-fox/domain";
import { createId, type ExerciseId } from "@silver-fox/types";
import { getCurrentUserIdSync } from "../supabase/auth";
import { supabase } from "../supabase/client";
import { exerciseRowToDomain, exerciseToRow, type ExerciseRow } from "./exerciseMappers";

export { exerciseRowToDomain, exerciseToRow };

export async function loadExercises(): Promise<Exercise[]> {
  const [{ data: rows, error }, { data: subRows, error: subError }] = await Promise.all([
    supabase.from("exercises").select("*").order("name"),
    supabase.from("exercise_substitutions").select("exercise_id, substitute_exercise_id"),
  ]);
  if (error) throw error;
  if (subError) throw subError;

  const substitutionsByExercise = new Map<string, string[]>();
  for (const sub of subRows ?? []) {
    const list = substitutionsByExercise.get(sub.exercise_id) ?? [];
    list.push(sub.substitute_exercise_id);
    substitutionsByExercise.set(sub.exercise_id, list);
  }

  return (rows ?? []).map((row) =>
    exerciseRowToDomain(row as ExerciseRow, substitutionsByExercise.get(row.id) ?? []),
  );
}

export async function createExercise(
  input: Omit<Exercise, "id" | "createdAt" | "updatedAt" | "isCustom">,
): Promise<Exercise> {
  const ownerId = getCurrentUserIdSync();
  const now = new Date().toISOString();
  const exercise: Exercise = {
    ...input,
    id: createId("exercise") as ExerciseId,
    isCustom: true,
    ownerId,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase.from("exercises").insert(exerciseToRow(exercise));
  if (error) throw error;

  if (exercise.substitutionExerciseIds?.length) {
    const { error: subError } = await supabase.from("exercise_substitutions").insert(
      exercise.substitutionExerciseIds.map((substituteExerciseId) => ({
        exercise_id: exercise.id,
        substitute_exercise_id: substituteExerciseId,
      })),
    );
    if (subError) throw subError;
  }

  return exercise;
}
