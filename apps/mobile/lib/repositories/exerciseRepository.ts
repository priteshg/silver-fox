import type { Exercise } from "@silver-fox/domain";
import { createId } from "@silver-fox/types";
import { exercisesStorageSchema } from "@silver-fox/validation";
import { SEED_EXERCISES } from "../../data/seedExercises";
import { readJson, writeJson } from "../storage/asyncStore";
import { STORAGE_KEYS } from "../storage/keys";

export async function loadExercises(): Promise<Exercise[]> {
  const raw = await readJson(STORAGE_KEYS.exercises);
  if (raw !== null) {
    const parsed = exercisesStorageSchema.safeParse(raw);
    if (parsed.success) return parsed.data as Exercise[];
  }
  await writeJson(STORAGE_KEYS.exercises, SEED_EXERCISES);
  return SEED_EXERCISES;
}

async function saveExercises(exercises: Exercise[]): Promise<void> {
  await writeJson(STORAGE_KEYS.exercises, exercises);
}

export async function createExercise(
  input: Omit<Exercise, "id" | "createdAt" | "updatedAt" | "isCustom">,
): Promise<Exercise> {
  const exercises = await loadExercises();
  const now = new Date().toISOString();
  const exercise: Exercise = {
    ...input,
    id: createId("exercise") as Exercise["id"],
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
  await saveExercises([...exercises, exercise]);
  return exercise;
}
