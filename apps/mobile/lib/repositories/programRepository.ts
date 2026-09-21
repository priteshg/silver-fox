import type { Exercise, Program, ProgramExercise, WorkoutDay } from "@silver-fox/domain";
import { reorderByIndex } from "@silver-fox/domain";
import { createId, type ProgramId, type WorkoutDayId } from "@silver-fox/types";
import { SEED_PROGRAM_ID } from "../../data/programmeCatalogue";
import { getCurrentUserIdSync } from "../supabase/auth";
import { supabase } from "../supabase/client";
import { loadExercises } from "./exerciseRepository";
import { getProfile, setActiveProgramId } from "./userRepository";
import {
  dayRowToDomain,
  dayToRow,
  programExerciseRowToDomain,
  programExerciseToRow,
  programRowToDomain,
  programToRow,
  type ProgramExerciseRow,
} from "./programMappers";

export { dayRowToDomain, dayToRow, programExerciseRowToDomain, programExerciseToRow, programRowToDomain, programToRow };

export interface ProgramDayDetail {
  day: WorkoutDay;
  exercises: (ProgramExercise & { exercise: Exercise })[];
}

export interface ProgramDetail {
  program: Program;
  days: ProgramDayDetail[];
}

export async function listPrograms(): Promise<Program[]> {
  const { data, error } = await supabase.from("programs").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(programRowToDomain);
}

/**
 * Which programme the user is actively following — stored on their profile
 * in Postgres (see userRepository.ts's `active_program_id`), not device-only
 * storage, so it's real, durable application state rather than something
 * lost on a reinstall or inconsistent across devices. Defaults to the
 * flagship Foundation 40+ so existing behaviour is unchanged until someone
 * explicitly picks something else.
 */
export async function getSelectedProgramId(): Promise<ProgramId> {
  const profile = await getProfile();
  return profile.activeProgramId ?? SEED_PROGRAM_ID;
}

export async function setSelectedProgramId(programId: ProgramId): Promise<void> {
  await setActiveProgramId(programId);
}

/** All programme sessions across every programme — used to resolve a historical workout's day name. */
export async function listWorkoutDays(): Promise<WorkoutDay[]> {
  const { data, error } = await supabase.from("program_sessions").select("*").order("order");
  if (error) throw error;
  return (data ?? []).map(dayRowToDomain);
}

function buildDetail(
  program: Program,
  days: WorkoutDay[],
  programExercises: ProgramExercise[],
  exercises: Exercise[],
): ProgramDetail {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const programDays = days
    .filter((day) => day.programId === program.id)
    .sort((a, b) => a.order - b.order)
    .map((day) => {
      const dayExercises = programExercises
        .filter((pe) => pe.workoutDayId === day.id)
        .sort((a, b) => a.order - b.order)
        .flatMap((pe) => {
          const exercise = exerciseById.get(pe.exerciseId);
          return exercise ? [{ ...pe, exercise }] : [];
        });
      return { day, exercises: dayExercises };
    });
  return { program, days: programDays };
}

export async function getProgramDetail(programId: ProgramId): Promise<ProgramDetail | null> {
  const [{ data: programRow, error: programError }, { data: dayRows, error: dayError }, exercises] =
    await Promise.all([
      supabase.from("programs").select("*").eq("id", programId).maybeSingle(),
      supabase.from("program_sessions").select("*").eq("program_id", programId).order("order"),
      loadExercises(),
    ]);
  if (programError) throw programError;
  if (dayError) throw dayError;
  if (!programRow) return null;

  const days = (dayRows ?? []).map(dayRowToDomain);
  const sessionIds = days.map((day) => day.id);
  const { data: peRows, error: peError } = sessionIds.length
    ? await supabase.from("program_exercises").select("*").in("session_id", sessionIds).order("order")
    : { data: [] as ProgramExerciseRow[], error: null };
  if (peError) throw peError;

  const programExercises = (peRows ?? []).map(programExerciseRowToDomain);
  return buildDetail(programRowToDomain(programRow), days, programExercises, exercises);
}

export async function createProgram(input: {
  name: string;
  description?: string;
  dayNames: string[];
}): Promise<ProgramDetail> {
  const ownerId = getCurrentUserIdSync();
  const now = new Date().toISOString();
  const program: Program = {
    id: createId("program") as ProgramId,
    ownerId,
    name: input.name,
    description: input.description,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
  const newDays: WorkoutDay[] = input.dayNames.map((name, index) => ({
    id: createId("day") as WorkoutDayId,
    programId: program.id,
    name,
    order: index,
    // Custom programmes aren't necessarily push/pull/legs shaped, so there's
    // no focus to infer from a name a user typed freely.
    focus: "other",
    createdAt: now,
    updatedAt: now,
  }));

  const { error: programError } = await supabase.from("programs").insert(programToRow(program));
  if (programError) throw programError;

  if (newDays.length) {
    const { error: daysError } = await supabase.from("program_sessions").insert(newDays.map(dayToRow));
    if (daysError) throw daysError;
  }

  return buildDetail(program, newDays, [], await loadExercises());
}

/**
 * Clones a built-in programme's structure — its days and each day's
 * exercise targets — into a new programme owned by the current user.
 * Reuses the same row shapes (`programToRow`/`dayToRow`/`programExerciseToRow`)
 * ordinary custom-programme creation already writes, so this is the same
 * insert path with different source data, not a new one. References the
 * same shared `exercises` rows rather than copying them (built-in exercises
 * aren't owned by anyone, so there's nothing to duplicate).
 *
 * Deliberately does not touch workouts, workout_sets, or the profile —
 * cloning a programme is copying a plan, not fabricating a history. See
 * CORE_IMPLEMENTATION_PLAN.md Stage 4 and FOUNDATION_DECISIONS.md Decision 1
 * for why that boundary matters here.
 */
export async function cloneBuiltInProgram(builtInProgramId: ProgramId): Promise<ProgramDetail> {
  const source = await getProgramDetail(builtInProgramId);
  if (!source) throw new Error(`No such programme: ${builtInProgramId}`);

  const ownerId = getCurrentUserIdSync();
  const now = new Date().toISOString();
  const program: Program = {
    id: createId("program") as ProgramId,
    ownerId,
    name: source.program.name,
    description: source.program.description,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  const dayIdMap = new Map<WorkoutDayId, WorkoutDayId>();
  const newDays: WorkoutDay[] = source.days.map(({ day }) => {
    const newId = createId("day") as WorkoutDayId;
    dayIdMap.set(day.id, newId);
    return { ...day, id: newId, programId: program.id, createdAt: now, updatedAt: now };
  });

  const newProgramExercises: ProgramExercise[] = source.days.flatMap(({ exercises }) =>
    exercises.map((pe) => ({
      ...pe,
      id: createId("programExercise") as ProgramExercise["id"],
      workoutDayId: dayIdMap.get(pe.workoutDayId)!,
      createdAt: now,
      updatedAt: now,
    })),
  );

  const { error: programError } = await supabase.from("programs").insert(programToRow(program));
  if (programError) throw programError;

  if (newDays.length) {
    const { error: daysError } = await supabase.from("program_sessions").insert(newDays.map(dayToRow));
    if (daysError) throw daysError;
  }

  if (newProgramExercises.length) {
    const { error: peError } = await supabase
      .from("program_exercises")
      .insert(newProgramExercises.map(programExerciseToRow));
    if (peError) throw peError;
  }

  return buildDetail(program, newDays, newProgramExercises, await loadExercises());
}

export async function updateProgramInfo(
  programId: ProgramId,
  updates: { name?: string; description?: string },
): Promise<void> {
  const { error } = await supabase
    .from("programs")
    .update({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", programId);
  if (error) throw error;
}

export async function deleteProgram(programId: ProgramId): Promise<void> {
  // Built-in catalogue programmes have no owner row the RLS delete policy
  // will match, so this is a no-op against them even without a client-side
  // isCustom check — the database is the actual guard, not just the UI.
  const { error } = await supabase.from("programs").delete().eq("id", programId);
  if (error) throw error;
}

export async function renameDay(dayId: WorkoutDayId, name: string): Promise<void> {
  const { error } = await supabase
    .from("program_sessions")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", dayId);
  if (error) throw error;
}

export async function addDayToProgram(
  programId: ProgramId,
  input: { name: string; focus: WorkoutDay["focus"] },
): Promise<WorkoutDay> {
  const { count, error: countError } = await supabase
    .from("program_sessions")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);
  if (countError) throw countError;

  const now = new Date().toISOString();
  const day: WorkoutDay = {
    id: createId("day") as WorkoutDayId,
    programId,
    name: input.name,
    order: count ?? 0,
    focus: input.focus,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabase.from("program_sessions").insert(dayToRow(day));
  if (error) throw error;
  return day;
}

/** Also removes every programme exercise on that day (cascades in the database). */
export async function deleteDay(dayId: WorkoutDayId): Promise<void> {
  const { data: target, error: findError } = await supabase
    .from("program_sessions")
    .select("program_id, order")
    .eq("id", dayId)
    .maybeSingle();
  if (findError) throw findError;
  if (!target) return;

  const { error: deleteError } = await supabase.from("program_sessions").delete().eq("id", dayId);
  if (deleteError) throw deleteError;

  const { data: siblingRows, error: siblingsError } = await supabase
    .from("program_sessions")
    .select("id, order")
    .eq("program_id", target.program_id)
    .order("order");
  if (siblingsError) throw siblingsError;

  await Promise.all(
    (siblingRows ?? []).map((sibling, index) =>
      sibling.order === index
        ? Promise.resolve()
        : supabase.from("program_sessions").update({ order: index }).eq("id", sibling.id),
    ),
  );
}

export async function addExerciseToDay(
  dayId: WorkoutDayId,
  config: {
    exerciseId: Exercise["id"];
    targetSets: number;
    targetRepRangeLow: number;
    targetRepRangeHigh: number;
    targetRir?: number;
    restSeconds?: number;
  },
): Promise<ProgramExercise> {
  const { count, error: countError } = await supabase
    .from("program_exercises")
    .select("id", { count: "exact", head: true })
    .eq("session_id", dayId);
  if (countError) throw countError;

  const now = new Date().toISOString();
  const newExercise: ProgramExercise = {
    id: createId("programExercise") as ProgramExercise["id"],
    workoutDayId: dayId,
    exerciseId: config.exerciseId,
    order: count ?? 0,
    targetSets: config.targetSets,
    targetRepRangeLow: config.targetRepRangeLow,
    targetRepRangeHigh: config.targetRepRangeHigh,
    targetRir: config.targetRir,
    restSeconds: config.restSeconds,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase.from("program_exercises").insert(programExerciseToRow(newExercise));
  if (error) throw error;

  return newExercise;
}

export async function updateProgramExercise(
  programExerciseId: ProgramExercise["id"],
  updates: Partial<
    Pick<
      ProgramExercise,
      "targetSets" | "targetRepRangeLow" | "targetRepRangeHigh" | "targetRir" | "restSeconds"
    >
  >,
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.targetSets !== undefined) patch.target_sets = updates.targetSets;
  if (updates.targetRepRangeLow !== undefined) patch.target_rep_range_low = updates.targetRepRangeLow;
  if (updates.targetRepRangeHigh !== undefined) patch.target_rep_range_high = updates.targetRepRangeHigh;
  if (updates.targetRir !== undefined) patch.target_rir = updates.targetRir;
  if (updates.restSeconds !== undefined) patch.rest_seconds = updates.restSeconds;

  const { error } = await supabase.from("program_exercises").update(patch).eq("id", programExerciseId);
  if (error) throw error;
}

export async function removeProgramExercise(
  programExerciseId: ProgramExercise["id"],
): Promise<void> {
  const { data: target, error: findError } = await supabase
    .from("program_exercises")
    .select("session_id, order")
    .eq("id", programExerciseId)
    .maybeSingle();
  if (findError) throw findError;
  if (!target) return;

  const { error: deleteError } = await supabase.from("program_exercises").delete().eq("id", programExerciseId);
  if (deleteError) throw deleteError;

  const { data: siblingRows, error: siblingsError } = await supabase
    .from("program_exercises")
    .select("id, order")
    .eq("session_id", target.session_id)
    .order("order");
  if (siblingsError) throw siblingsError;

  await Promise.all(
    (siblingRows ?? []).map((sibling, index) =>
      sibling.order === index
        ? Promise.resolve()
        : supabase.from("program_exercises").update({ order: index }).eq("id", sibling.id),
    ),
  );
}

export async function reorderDayExercises(
  dayId: WorkoutDayId,
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("program_exercises")
    .select("id, order")
    .eq("session_id", dayId)
    .order("order");
  if (error) throw error;

  const reordered = reorderByIndex(rows ?? [], fromIndex, toIndex);
  await Promise.all(
    reordered.map((row) => supabase.from("program_exercises").update({ order: row.order }).eq("id", row.id)),
  );
}
