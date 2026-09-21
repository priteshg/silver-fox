import { describe, expect, it } from "vitest";
import { validateProgrammeCatalogue } from "../logic/programmeValidation";
import type { Exercise } from "../entities/exercise";
import type { Program } from "../entities/program";
import type { ProgramExercise } from "../entities/programExercise";
import type { WorkoutDay } from "../entities/workoutDay";
import type { ExerciseId, ProgramExerciseId, ProgramId, UserId, WorkoutDayId } from "@silver-fox/types";

const now = "2026-01-01T00:00:00.000Z";

function program(id: string): Program {
  return { id: id as ProgramId, ownerId: "user_1" as UserId, name: id, createdAt: now, updatedAt: now };
}

function day(id: string, programId: string): WorkoutDay {
  return { id: id as WorkoutDayId, programId: programId as ProgramId, name: id, order: 0, focus: "full_body", createdAt: now, updatedAt: now };
}

function exercise(id: string): Exercise {
  return {
    id: id as ExerciseId,
    name: id,
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: [],
    equipment: "barbell",
    laterality: "bilateral",
    description: "test",
    instructions: [],
    formCues: [],
    commonMistakes: [],
    isCustom: false,
    createdAt: now,
    updatedAt: now,
  };
}

function pe(id: string, workoutDayId: string, exerciseId: string, overrides: Partial<ProgramExercise> = {}): ProgramExercise {
  return {
    id: id as ProgramExerciseId,
    workoutDayId: workoutDayId as WorkoutDayId,
    exerciseId: exerciseId as ExerciseId,
    order: 0,
    targetSets: 3,
    targetRepRangeLow: 8,
    targetRepRangeHigh: 12,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("validateProgrammeCatalogue", () => {
  it("reports no issues for a well-formed catalogue", () => {
    const issues = validateProgrammeCatalogue({
      programs: [program("p1")],
      days: [day("d1", "p1")],
      programExercises: [pe("pe1", "d1", "ex1")],
      exercises: [exercise("ex1")],
    });
    expect(issues).toEqual([]);
  });

  it("flags a duplicate programme id", () => {
    const issues = validateProgrammeCatalogue({
      programs: [program("p1"), program("p1")],
      days: [day("d1", "p1")],
      programExercises: [pe("pe1", "d1", "ex1")],
      exercises: [exercise("ex1")],
    });
    expect(issues.some((i) => i.message.includes("Duplicate programme id"))).toBe(true);
  });

  it("flags a workout day pointing at a missing programme", () => {
    const issues = validateProgrammeCatalogue({
      programs: [program("p1")],
      days: [day("d1", "does-not-exist")],
      programExercises: [pe("pe1", "d1", "ex1")],
      exercises: [exercise("ex1")],
    });
    expect(issues.some((i) => i.message.includes("references a programme that doesn't exist"))).toBe(true);
  });

  it("flags a programme exercise referencing an unknown exercise", () => {
    const issues = validateProgrammeCatalogue({
      programs: [program("p1")],
      days: [day("d1", "p1")],
      programExercises: [pe("pe1", "d1", "ghost-exercise")],
      exercises: [exercise("ex1")],
    });
    expect(issues.some((i) => i.message.includes("references an exercise that doesn't exist"))).toBe(true);
  });

  it("flags a programme exercise referencing an unknown workout day", () => {
    const issues = validateProgrammeCatalogue({
      programs: [program("p1")],
      days: [day("d1", "p1")],
      programExercises: [pe("pe1", "ghost-day", "ex1")],
      exercises: [exercise("ex1")],
    });
    expect(issues.some((i) => i.message.includes("references a workout day that doesn't exist"))).toBe(true);
  });

  it("flags a workout day with no exercises", () => {
    const issues = validateProgrammeCatalogue({
      programs: [program("p1")],
      days: [day("d1", "p1")],
      programExercises: [],
      exercises: [],
    });
    expect(issues.some((i) => i.message.includes("has no exercises"))).toBe(true);
  });

  it("flags a programme with no workout days", () => {
    const issues = validateProgrammeCatalogue({
      programs: [program("p1")],
      days: [],
      programExercises: [],
      exercises: [],
    });
    expect(issues.some((i) => i.message.includes("has no workout days"))).toBe(true);
  });

  it("flags an inverted rep range", () => {
    const issues = validateProgrammeCatalogue({
      programs: [program("p1")],
      days: [day("d1", "p1")],
      programExercises: [pe("pe1", "d1", "ex1", { targetRepRangeLow: 12, targetRepRangeHigh: 8 })],
      exercises: [exercise("ex1")],
    });
    expect(issues.some((i) => i.message.includes("inverted rep range"))).toBe(true);
  });

  it("flags zero target sets", () => {
    const issues = validateProgrammeCatalogue({
      programs: [program("p1")],
      days: [day("d1", "p1")],
      programExercises: [pe("pe1", "d1", "ex1", { targetSets: 0 })],
      exercises: [exercise("ex1")],
    });
    expect(issues.some((i) => i.message.includes("target sets"))).toBe(true);
  });
});
