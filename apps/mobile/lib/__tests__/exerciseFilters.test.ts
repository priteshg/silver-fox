import type { Exercise } from "@silver-fox/domain";
import type { ExerciseId } from "@silver-fox/types";
import { describe, expect, it } from "vitest";
import { filterExercises } from "../exerciseFilters";

const now = "2026-01-01T00:00:00.000Z";

function exercise(overrides: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: [],
    equipment: "barbell",
    description: "",
    instructions: [],
    formCues: [],
    commonMistakes: [],
    isCustom: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const exercises: Exercise[] = [
  exercise({ id: "1" as ExerciseId, name: "Bench Press", primaryMuscleGroup: "chest", equipment: "barbell" }),
  exercise({ id: "2" as ExerciseId, name: "Pull Up", primaryMuscleGroup: "back", equipment: "bodyweight" }),
  exercise({ id: "3" as ExerciseId, name: "Incline Bench Press", primaryMuscleGroup: "chest", equipment: "dumbbell" }),
];

describe("filterExercises", () => {
  it("returns everything when no criteria are given", () => {
    expect(filterExercises(exercises, {})).toHaveLength(3);
  });

  it("filters by a case-insensitive name query", () => {
    const result = filterExercises(exercises, { query: "bench" });
    expect(result.map((e) => e.name)).toEqual(["Bench Press", "Incline Bench Press"]);
  });

  it("filters by muscle group", () => {
    const result = filterExercises(exercises, { muscleGroup: "back" });
    expect(result.map((e) => e.name)).toEqual(["Pull Up"]);
  });

  it("filters by equipment", () => {
    const result = filterExercises(exercises, { equipment: "dumbbell" });
    expect(result.map((e) => e.name)).toEqual(["Incline Bench Press"]);
  });

  it("combines query, muscle group, and equipment filters", () => {
    const result = filterExercises(exercises, { query: "press", muscleGroup: "chest", equipment: "barbell" });
    expect(result.map((e) => e.name)).toEqual(["Bench Press"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterExercises(exercises, { query: "squat" })).toEqual([]);
  });
});
