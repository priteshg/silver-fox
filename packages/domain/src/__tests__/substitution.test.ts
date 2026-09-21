import { describe, expect, it } from "vitest";
import { findSubstitutes } from "../logic/substitution";
import type { Exercise } from "../entities/exercise";
import type { ExerciseId } from "@silver-fox/types";

const now = "2026-01-01T00:00:00.000Z";

function exercise(overrides: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  return {
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: [],
    equipment: "barbell",
    laterality: "bilateral",
    movementPattern: "horizontal_push",
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

const benchPress = exercise({
  id: "bench_press" as ExerciseId,
  name: "Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["shoulders", "triceps"],
  equipment: "barbell",
  laterality: "bilateral",
  movementPattern: "horizontal_push",
  difficulty: "intermediate",
});

const dumbbellBenchPress = exercise({
  id: "dumbbell_bench_press" as ExerciseId,
  name: "Dumbbell Bench Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["shoulders", "triceps"],
  equipment: "dumbbell",
  laterality: "bilateral",
  movementPattern: "horizontal_push",
  difficulty: "intermediate",
});

const machineChestPress = exercise({
  id: "machine_chest_press" as ExerciseId,
  name: "Machine Chest Press",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["shoulders", "triceps"],
  equipment: "machine",
  laterality: "bilateral",
  movementPattern: "horizontal_push",
  difficulty: "beginner",
});

const pushUp = exercise({
  id: "push_up" as ExerciseId,
  name: "Push-Up",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: ["shoulders", "triceps"],
  equipment: "bodyweight",
  laterality: "bilateral",
  movementPattern: "horizontal_push",
  difficulty: "beginner",
});

const cableFly = exercise({
  id: "cable_fly" as ExerciseId,
  name: "Cable Fly",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: [],
  equipment: "cable",
  laterality: "bilateral",
  movementPattern: "isolation",
  difficulty: "intermediate",
});

const legPress = exercise({
  id: "leg_press" as ExerciseId,
  name: "Leg Press",
  primaryMuscleGroup: "legs",
  secondaryMuscleGroups: ["glutes"],
  equipment: "machine",
  laterality: "bilateral",
  movementPattern: "squat",
});

const bicepCurl = exercise({
  id: "bicep_curl" as ExerciseId,
  name: "Bicep Curl",
  primaryMuscleGroup: "biceps",
  secondaryMuscleGroups: [],
  equipment: "dumbbell",
  laterality: "bilateral",
  movementPattern: "isolation",
});

const unclassifiedCustomChestExercise = exercise({
  id: "my_chest_thing" as ExerciseId,
  name: "My Chest Thing",
  primaryMuscleGroup: "chest",
  secondaryMuscleGroups: [],
  equipment: "dumbbell",
  laterality: "bilateral",
  movementPattern: undefined,
  isCustom: true,
});

const library = [benchPress, dumbbellBenchPress, machineChestPress, pushUp, cableFly, legPress, bicepCurl];

describe("findSubstitutes — hard filters", () => {
  it("never suggests the exercise itself", () => {
    const results = findSubstitutes({ original: benchPress, candidates: library });
    expect(results.some((r) => r.exercise.id === benchPress.id)).toBe(false);
  });

  it("excludes exercises that train a different primary muscle", () => {
    const results = findSubstitutes({ original: benchPress, candidates: library });
    expect(results.some((r) => r.exercise.id === legPress.id)).toBe(false);
    expect(results.some((r) => r.exercise.id === bicepCurl.id)).toBe(false);
  });

  it("excludes equipment the person doesn't have, except bodyweight which is always available", () => {
    const results = findSubstitutes({
      original: benchPress,
      candidates: library,
      availableEquipment: ["dumbbell"],
    });
    const ids = results.map((r) => r.exercise.id);
    expect(ids).toContain(dumbbellBenchPress.id);
    expect(ids).toContain(pushUp.id);
    expect(ids).not.toContain(machineChestPress.id);
    expect(ids).not.toContain(cableFly.id);
  });

  it("applies no equipment filtering when no equipment set is supplied", () => {
    const results = findSubstitutes({ original: benchPress, candidates: library });
    const ids = results.map((r) => r.exercise.id);
    expect(ids).toContain(machineChestPress.id);
    expect(ids).toContain(cableFly.id);
  });

  it("excludes a candidate with no movementPattern from auto-suggestions", () => {
    const results = findSubstitutes({
      original: benchPress,
      candidates: [...library, unclassifiedCustomChestExercise],
    });
    expect(results.some((r) => r.exercise.id === unclassifiedCustomChestExercise.id)).toBe(false);
  });

  it("returns an empty list, not an error, when nothing survives filtering", () => {
    const onlyLegExercise = [legPress];
    const results = findSubstitutes({ original: benchPress, candidates: onlyLegExercise });
    expect(results).toEqual([]);
  });
});

describe("findSubstitutes — ranking", () => {
  it("ranks a same-movement-pattern candidate above a different-pattern one", () => {
    const results = findSubstitutes({ original: benchPress, candidates: library });
    const dumbbellRank = results.findIndex((r) => r.exercise.id === dumbbellBenchPress.id);
    const cableFlyRank = results.findIndex((r) => r.exercise.id === cableFly.id);
    expect(dumbbellRank).toBeGreaterThanOrEqual(0);
    expect(cableFlyRank).toBeGreaterThanOrEqual(0);
    expect(dumbbellRank).toBeLessThan(cableFlyRank);
  });

  it("ranks a same-laterality candidate above a different-laterality one, all else equal", () => {
    const bilateralRow = exercise({
      id: "bilateral_row" as ExerciseId,
      name: "Bilateral Row",
      primaryMuscleGroup: "back",
      equipment: "dumbbell",
      laterality: "bilateral",
      movementPattern: "horizontal_pull",
    });
    const unilateralRow = exercise({
      id: "unilateral_row" as ExerciseId,
      name: "Unilateral Row",
      primaryMuscleGroup: "back",
      equipment: "dumbbell",
      laterality: "unilateral",
      movementPattern: "horizontal_pull",
    });
    const original = exercise({
      id: "cable_row" as ExerciseId,
      name: "Cable Row",
      primaryMuscleGroup: "back",
      equipment: "cable",
      laterality: "bilateral",
      movementPattern: "horizontal_pull",
    });
    const results = findSubstitutes({
      original,
      candidates: [bilateralRow, unilateralRow],
    });
    expect(results[0]?.exercise.id).toBe(bilateralRow.id);
    expect(results[1]?.exercise.id).toBe(unilateralRow.id);
  });

  it("gives a curated relationship a ranking bonus over an equivalent uncurated one", () => {
    // Two candidates identical in every scored factor except curation.
    const results = findSubstitutes({
      original: benchPress,
      candidates: [dumbbellBenchPress, machineChestPress],
      curated: [{ exerciseId: benchPress.id, substituteExerciseId: machineChestPress.id }],
    });
    // dumbbellBenchPress matches laterality/pattern/muscle identically to
    // machineChestPress here (same difficulty tier isn't shared — beginner
    // vs intermediate — so isolate the curation effect on its own pair).
    const sameShapeResults = findSubstitutes({
      original: benchPress,
      candidates: [pushUp, machineChestPress],
      curated: [{ exerciseId: benchPress.id, substituteExerciseId: machineChestPress.id }],
    });
    const machineScore = sameShapeResults.find((r) => r.exercise.id === machineChestPress.id)?.score;
    const uncuratedResults = findSubstitutes({
      original: benchPress,
      candidates: [pushUp, machineChestPress],
    });
    const uncuratedMachineScore = uncuratedResults.find((r) => r.exercise.id === machineChestPress.id)?.score;
    expect(machineScore).toBe((uncuratedMachineScore ?? 0) + 1);
    expect(results.length).toBeGreaterThan(0);
  });

  it("breaks ties deterministically by name", () => {
    const a = exercise({
      id: "z_press" as ExerciseId,
      name: "Z Press",
      primaryMuscleGroup: "chest",
      equipment: "dumbbell",
      laterality: "bilateral",
      movementPattern: "horizontal_push",
    });
    const b = exercise({
      id: "a_press" as ExerciseId,
      name: "A Press",
      primaryMuscleGroup: "chest",
      equipment: "dumbbell",
      laterality: "bilateral",
      movementPattern: "horizontal_push",
    });
    const results = findSubstitutes({ original: benchPress, candidates: [a, b] });
    expect(results.map((r) => r.exercise.name)).toEqual(["A Press", "Z Press"]);
  });
});

describe("findSubstitutes — explanations", () => {
  it("mentions the equipment difference only when equipment actually differs", () => {
    const results = findSubstitutes({ original: benchPress, candidates: [dumbbellBenchPress] });
    expect(results[0]?.reason).toMatch(/dumbbell instead of barbell/);
  });

  it("does not mention an equipment difference when equipment is the same", () => {
    const sameEquipmentVariant = exercise({
      id: "close_grip_bench" as ExerciseId,
      name: "Close-Grip Bench Press",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: ["triceps"],
      equipment: "barbell",
      laterality: "bilateral",
      movementPattern: "horizontal_push",
    });
    const results = findSubstitutes({ original: benchPress, candidates: [sameEquipmentVariant] });
    expect(results[0]?.reason).not.toMatch(/instead of/);
  });

  it("mentions the curated relationship only when the candidate is actually curated", () => {
    const curatedResults = findSubstitutes({
      original: benchPress,
      candidates: [machineChestPress],
      curated: [{ exerciseId: benchPress.id, substituteExerciseId: machineChestPress.id }],
    });
    const uncuratedResults = findSubstitutes({ original: benchPress, candidates: [machineChestPress] });
    expect(curatedResults[0]?.reason).toMatch(/coach-recommended/);
    expect(uncuratedResults[0]?.reason).not.toMatch(/coach-recommended/);
  });
});
