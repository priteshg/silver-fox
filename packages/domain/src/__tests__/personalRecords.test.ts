import { describe, expect, it } from "vitest";
import { calculateCurrentRecords, findMostRecentPersonalRecord, findPersonalRecords } from "../logic/personalRecords";
import type { Workout } from "../entities/workout";
import type { WorkoutSet } from "../entities/workoutSet";
import type { ExerciseId, ProgramId, UserId, WorkoutId, WorkoutSetId } from "@silver-fox/types";

const exerciseId = "exercise_1" as ExerciseId;
const now = "2026-01-01T00:00:00.000Z";

function set(id: string, weight: number, reps: number, workoutId = "w1"): WorkoutSet {
  return {
    id: id as WorkoutSetId,
    workoutId: workoutId as WorkoutId,
    exerciseId,
    order: 1,
    weight,
    weightUnit: "kg",
    reps,
    createdAt: now,
    updatedAt: now,
  };
}

function workout(id: string, completedAt: string): Workout {
  return {
    id: id as WorkoutId,
    userId: "user_1" as UserId,
    programId: "program_1" as ProgramId,
    startedAt: completedAt,
    completedAt,
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}

describe("findPersonalRecords", () => {
  it("reports a weight PR when the new top set beats prior history", () => {
    const prior = [set("p1", 100, 5)];
    const current = [set("c1", 105, 5, "w2")];
    const records = findPersonalRecords(prior, current);
    expect(records).toContainEqual({
      exerciseId,
      type: "weight",
      value: 105,
      previousBest: 100,
    });
  });

  it("reports an estimated 1RM PR when reps push the estimate higher at a lower weight", () => {
    // prior: 100kg x 1 (1RM ~100). current: 90kg x 8 (Epley ~114) — higher 1RM, lower weight.
    const prior = [set("p1", 100, 1)];
    const current = [set("c1", 90, 8, "w2")];
    const records = findPersonalRecords(prior, current);
    const oneRmRecord = records.find((r) => r.type === "estimatedOneRepMax");
    expect(oneRmRecord).toBeDefined();
    expect(oneRmRecord?.previousBest).toBe(100);
  });

  it("does not report a PR for an exercise with no prior history", () => {
    const records = findPersonalRecords([], [set("c1", 200, 5, "w2")]);
    expect(records).toEqual([]);
  });

  it("does not report a PR when the new set does not beat prior best", () => {
    const prior = [set("p1", 100, 5)];
    const current = [set("c1", 80, 5, "w2")];
    expect(findPersonalRecords(prior, current)).toEqual([]);
  });

  it("ignores other exercises' history when checking a PR", () => {
    const otherExercise = "exercise_2" as ExerciseId;
    const prior: WorkoutSet[] = [{ ...set("p1", 500, 5), exerciseId: otherExercise }];
    const current = [set("c1", 50, 5, "w2")];
    expect(findPersonalRecords(prior, current)).toEqual([]);
  });

  it("reports a repsAtWeight PR when more reps are done at a previously-used weight", () => {
    const prior = [set("p1", 80, 6)];
    const current = [set("c1", 80, 9, "w2")];
    const records = findPersonalRecords(prior, current);
    expect(records).toContainEqual({
      exerciseId,
      type: "repsAtWeight",
      value: 9,
      previousBest: 6,
      atWeight: 80,
    });
  });

  it("does not report a repsAtWeight PR at a weight never used before", () => {
    const prior = [set("p1", 80, 6)];
    const current = [set("c1", 100, 3, "w2")];
    const records = findPersonalRecords(prior, current);
    expect(records.some((r) => r.type === "repsAtWeight")).toBe(false);
  });
});

describe("findMostRecentPersonalRecord", () => {
  it("returns null when nothing has ever been a PR", () => {
    const workouts = [workout("w1", "2026-01-05T00:00:00.000Z")];
    const sets = [set("s1", 100, 5, "w1")];
    expect(findMostRecentPersonalRecord(workouts, sets)).toBeNull();
  });

  it("finds the PR in the most recent workout that has one", () => {
    const workouts = [
      workout("w1", "2026-01-01T00:00:00.000Z"),
      workout("w2", "2026-01-08T00:00:00.000Z"),
      workout("w3", "2026-01-15T00:00:00.000Z"),
    ];
    const sets = [
      set("s1", 100, 5, "w1"),
      set("s2", 105, 5, "w2"), // a PR at the time
      set("s3", 105, 5, "w3"), // not a PR — ties w2, doesn't beat it
    ];
    const result = findMostRecentPersonalRecord(workouts, sets);
    expect(result?.workoutId).toBe("w2");
    expect(result?.record.type).toBe("weight");
    expect(result?.record.value).toBe(105);
  });

  it("ignores an in-progress or uncompleted workout", () => {
    const workouts: Workout[] = [
      workout("w1", "2026-01-01T00:00:00.000Z"),
      { ...workout("w2", "2026-01-08T00:00:00.000Z"), completedAt: undefined },
    ];
    const sets = [set("s1", 100, 5, "w1"), set("s2", 200, 5, "w2")];
    expect(findMostRecentPersonalRecord(workouts, sets)).toBeNull();
  });
});

describe("calculateCurrentRecords", () => {
  it("returns null when there is no history", () => {
    expect(calculateCurrentRecords([])).toBeNull();
  });

  it("computes the heaviest weight, best estimated 1RM, and best session volume", () => {
    const sets = [
      set("s1", 100, 5, "w1"),
      set("s2", 100, 5, "w1"),
      set("s3", 110, 3, "w2"),
    ];
    const records = calculateCurrentRecords(sets);
    expect(records?.heaviestWeight).toBe(110);
    expect(records?.bestSessionVolume).toBe(1000); // w1: 100*5 + 100*5
    expect(records?.bestEstimatedOneRepMax).toBeGreaterThan(110);
  });
});
