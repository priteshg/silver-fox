import type { Exercise, Program, ProgramExercise, WorkoutDay } from "@silver-fox/domain";
import { reorderByIndex } from "@silver-fox/domain";
import { createId, type ProgramId, type WorkoutDayId } from "@silver-fox/types";
import {
  programExercisesStorageSchema,
  programsStorageSchema,
  workoutDaysStorageSchema,
} from "@silver-fox/validation";
import { LOCAL_USER_ID } from "../../data/currentUser";
import { SEED_PROGRAM_EXERCISES, SEED_PROGRAM_ID, SEED_PROGRAMS, SEED_WORKOUT_DAYS } from "../../data/programmeCatalogue";
import { readJson, writeJson } from "../storage/asyncStore";
import { STORAGE_KEYS } from "../storage/keys";
import { loadExercises } from "./exerciseRepository";

export interface ProgramDayDetail {
  day: WorkoutDay;
  exercises: (ProgramExercise & { exercise: Exercise })[];
}

export interface ProgramDetail {
  program: Program;
  days: ProgramDayDetail[];
}

async function loadPrograms(): Promise<Program[]> {
  const raw = await readJson(STORAGE_KEYS.programs);
  if (raw !== null) {
    const parsed = programsStorageSchema.safeParse(raw);
    if (parsed.success) return parsed.data as Program[];
  }
  await writeJson(STORAGE_KEYS.programs, SEED_PROGRAMS);
  return SEED_PROGRAMS;
}

async function loadWorkoutDays(): Promise<WorkoutDay[]> {
  const raw = await readJson(STORAGE_KEYS.workoutDays);
  if (raw !== null) {
    const parsed = workoutDaysStorageSchema.safeParse(raw);
    if (parsed.success) return parsed.data as WorkoutDay[];
  }
  await writeJson(STORAGE_KEYS.workoutDays, SEED_WORKOUT_DAYS);
  return SEED_WORKOUT_DAYS;
}

async function loadProgramExercises(): Promise<ProgramExercise[]> {
  const raw = await readJson(STORAGE_KEYS.programExercises);
  if (raw !== null) {
    const parsed = programExercisesStorageSchema.safeParse(raw);
    if (parsed.success) return parsed.data as ProgramExercise[];
  }
  await writeJson(STORAGE_KEYS.programExercises, SEED_PROGRAM_EXERCISES);
  return SEED_PROGRAM_EXERCISES;
}

function savePrograms(programs: Program[]) {
  return writeJson(STORAGE_KEYS.programs, programs);
}
function saveWorkoutDays(days: WorkoutDay[]) {
  return writeJson(STORAGE_KEYS.workoutDays, days);
}
function saveProgramExercises(programExercises: ProgramExercise[]) {
  return writeJson(STORAGE_KEYS.programExercises, programExercises);
}

export async function listPrograms(): Promise<Program[]> {
  return loadPrograms();
}

/**
 * Which programme the user is actively following. Defaults to the flagship
 * Foundation 40+ so existing behaviour is unchanged until someone explicitly
 * picks something else from the catalogue.
 */
export async function getSelectedProgramId(): Promise<ProgramId> {
  const raw = await readJson(STORAGE_KEYS.selectedProgramId);
  return typeof raw === "string" && raw.length > 0 ? (raw as ProgramId) : SEED_PROGRAM_ID;
}

export async function setSelectedProgramId(programId: ProgramId): Promise<void> {
  await writeJson(STORAGE_KEYS.selectedProgramId, programId);
}

/** All workout days across every programme — used to resolve a historical workout's day name. */
export async function listWorkoutDays(): Promise<WorkoutDay[]> {
  return loadWorkoutDays();
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
  const [programs, days, programExercises, exercises] = await Promise.all([
    loadPrograms(),
    loadWorkoutDays(),
    loadProgramExercises(),
    loadExercises(),
  ]);
  const program = programs.find((p) => p.id === programId);
  if (!program) return null;
  return buildDetail(program, days, programExercises, exercises);
}

export async function createProgram(input: {
  name: string;
  description?: string;
  dayNames: string[];
}): Promise<ProgramDetail> {
  const now = new Date().toISOString();
  const program: Program = {
    id: createId("program") as ProgramId,
    ownerId: LOCAL_USER_ID,
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

  const [programs, days, programExercises, exercises] = await Promise.all([
    loadPrograms(),
    loadWorkoutDays(),
    loadProgramExercises(),
    loadExercises(),
  ]);

  await Promise.all([savePrograms([...programs, program]), saveWorkoutDays([...days, ...newDays])]);

  return buildDetail(program, [...days, ...newDays], programExercises, exercises);
}

export async function updateProgramInfo(
  programId: ProgramId,
  updates: { name?: string; description?: string },
): Promise<void> {
  const programs = await loadPrograms();
  const now = new Date().toISOString();
  await savePrograms(
    programs.map((program) =>
      program.id === programId ? { ...program, ...updates, updatedAt: now } : program,
    ),
  );
}

export async function deleteProgram(programId: ProgramId): Promise<void> {
  const [programs, days, programExercises] = await Promise.all([
    loadPrograms(),
    loadWorkoutDays(),
    loadProgramExercises(),
  ]);
  const target = programs.find((program) => program.id === programId);
  if (!target?.isCustom) return; // Built-in catalogue programmes aren't deletable.
  const remainingDays = days.filter((day) => day.programId !== programId);
  const removedDayIds = new Set(
    days.filter((day) => day.programId === programId).map((day) => day.id),
  );
  await Promise.all([
    savePrograms(programs.filter((program) => program.id !== programId)),
    saveWorkoutDays(remainingDays),
    saveProgramExercises(programExercises.filter((pe) => !removedDayIds.has(pe.workoutDayId))),
  ]);
}

export async function renameDay(dayId: WorkoutDayId, name: string): Promise<void> {
  const days = await loadWorkoutDays();
  const now = new Date().toISOString();
  await saveWorkoutDays(
    days.map((day) => (day.id === dayId ? { ...day, name, updatedAt: now } : day)),
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
  const programExercises = await loadProgramExercises();
  const now = new Date().toISOString();
  const siblingCount = programExercises.filter((pe) => pe.workoutDayId === dayId).length;
  const newExercise: ProgramExercise = {
    id: createId("programExercise") as ProgramExercise["id"],
    workoutDayId: dayId,
    exerciseId: config.exerciseId,
    order: siblingCount,
    targetSets: config.targetSets,
    targetRepRangeLow: config.targetRepRangeLow,
    targetRepRangeHigh: config.targetRepRangeHigh,
    targetRir: config.targetRir,
    restSeconds: config.restSeconds,
    createdAt: now,
    updatedAt: now,
  };
  await saveProgramExercises([...programExercises, newExercise]);
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
  const programExercises = await loadProgramExercises();
  const now = new Date().toISOString();
  await saveProgramExercises(
    programExercises.map((pe) =>
      pe.id === programExerciseId ? { ...pe, ...updates, updatedAt: now } : pe,
    ),
  );
}

export async function removeProgramExercise(
  programExerciseId: ProgramExercise["id"],
): Promise<void> {
  const programExercises = await loadProgramExercises();
  const target = programExercises.find((pe) => pe.id === programExerciseId);
  if (!target) return;
  const siblings = programExercises.filter(
    (pe) => pe.workoutDayId === target.workoutDayId && pe.id !== programExerciseId,
  );
  const renumbered = siblings
    .sort((a, b) => a.order - b.order)
    .map((pe, index) => ({ ...pe, order: index }));
  const others = programExercises.filter((pe) => pe.workoutDayId !== target.workoutDayId);
  await saveProgramExercises([...others, ...renumbered]);
}

export async function reorderDayExercises(
  dayId: WorkoutDayId,
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  const programExercises = await loadProgramExercises();
  const dayExercises = programExercises.filter((pe) => pe.workoutDayId === dayId);
  const reordered = reorderByIndex(dayExercises, fromIndex, toIndex);
  const others = programExercises.filter((pe) => pe.workoutDayId !== dayId);
  await saveProgramExercises([...others, ...reordered]);
}
