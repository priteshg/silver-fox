import type { Exercise, Program, ProgramExercise, WorkoutDay } from "@silver-fox/domain";
import type { ExerciseId, ProgramExerciseId, ProgramId, WorkoutDayId } from "@silver-fox/types";
import { beforeEach, describe, expect, it } from "vitest";
import { resetFakeDb, type FakeRow } from "../../../test/fakeSupabase";
import { fakeSupabaseDb } from "../../../vitest.setup";
import { exerciseToRow } from "../exerciseMappers";
import { cloneBuiltInProgram, dayToRow, getProgramDetail, programExerciseToRow, programToRow } from "../programRepository";

const now = "2026-01-01T00:00:00.000Z";
const builtInId = "program_builtin" as ProgramId;
const builtInDayId = "day_builtin" as WorkoutDayId;
const exerciseId = "ex_builtin" as ExerciseId;

/** Seeds a minimal built-in (no owner) programme directly into the fake DB — mirroring what a real seed migration would insert. */
function seedBuiltInProgram() {
  const program: Program = { id: builtInId, name: "Built-In Split", description: "A shared catalogue programme.", isCustom: false, createdAt: now, updatedAt: now };
  const day: WorkoutDay = { id: builtInDayId, programId: builtInId, name: "Push", order: 0, focus: "push", createdAt: now, updatedAt: now };
  const exercise: Exercise = {
    id: exerciseId,
    name: "Bench Press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: [],
    equipment: "barbell",
    laterality: "bilateral",
    description: "",
    instructions: [],
    formCues: [],
    commonMistakes: [],
    isCustom: false,
    createdAt: now,
    updatedAt: now,
  };
  const programExercise: ProgramExercise = {
    id: "pe_builtin" as ProgramExerciseId,
    workoutDayId: builtInDayId,
    exerciseId,
    order: 0,
    targetSets: 3,
    targetRepRangeLow: 6,
    targetRepRangeHigh: 10,
    targetRir: 2,
    restSeconds: 150,
    createdAt: now,
    updatedAt: now,
  };

  // The fake DB's rows are plain Record<string, unknown> — the mapper
  // functions return concrete row interfaces, which is what every real
  // repository call already produces, but assigning straight into the fake
  // DB (rather than through the fake client's own .insert()) needs an
  // explicit widening to that shape.
  fakeSupabaseDb.programs = [programToRow(program) as unknown as FakeRow];
  fakeSupabaseDb.program_sessions = [dayToRow(day) as unknown as FakeRow];
  fakeSupabaseDb.program_exercises = [programExerciseToRow(programExercise) as unknown as FakeRow];
  fakeSupabaseDb.exercises = [exerciseToRow(exercise) as unknown as FakeRow];
}

describe("cloneBuiltInProgram", () => {
  beforeEach(() => {
    resetFakeDb(fakeSupabaseDb);
    seedBuiltInProgram();
  });

  it("creates a new, owned programme with the same days and exercise targets", async () => {
    const cloned = await cloneBuiltInProgram(builtInId);

    expect(cloned.program.id).not.toBe(builtInId);
    expect(cloned.program.name).toBe("Built-In Split");
    expect(cloned.program.isCustom).toBe(true);
    expect(cloned.program.ownerId).toBeDefined();
    expect(cloned.days).toHaveLength(1);
    expect(cloned.days[0]?.day.name).toBe("Push");
    expect(cloned.days[0]?.exercises).toHaveLength(1);
    expect(cloned.days[0]?.exercises[0]?.exerciseId).toBe(exerciseId);
    expect(cloned.days[0]?.exercises[0]?.targetRepRangeLow).toBe(6);
    expect(cloned.days[0]?.exercises[0]?.targetRepRangeHigh).toBe(10);
  });

  it("leaves the original built-in programme completely untouched", async () => {
    await cloneBuiltInProgram(builtInId);

    const original = await getProgramDetail(builtInId);
    expect(original?.program.id).toBe(builtInId);
    expect(original?.program.isCustom).toBe(false);
    expect(original?.days).toHaveLength(1);
  });

  it("references the same shared exercise rather than copying it", async () => {
    const cloned = await cloneBuiltInProgram(builtInId);
    expect(cloned.days[0]?.exercises[0]?.exercise.id).toBe(exerciseId);
    // Only one exercises row should exist — cloning a programme's structure
    // never duplicates the exercises it points to.
    expect(fakeSupabaseDb.exercises).toHaveLength(1);
  });

  it("creates fresh ids for the cloned programme and days, not reusing the built-in's", async () => {
    const cloned = await cloneBuiltInProgram(builtInId);
    expect(cloned.days[0]?.day.id).not.toBe(builtInDayId);
    expect(cloned.days[0]?.exercises[0]?.id).not.toBe("pe_builtin");
  });
});
