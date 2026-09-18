import { describe, expect, it } from "vitest";
import { buildWorkoutSummary } from "../logic/workoutSummary";
import type { Workout } from "../entities/workout";
import type { WorkoutSet } from "../entities/workoutSet";
import type { ExerciseId, UserId, WorkoutId, WorkoutSetId } from "@silver-fox/types";

const userId = "user_1" as UserId;
const exerciseId = "exercise_1" as ExerciseId;

function set(id: string, weight: number, reps: number): WorkoutSet {
  return {
    id: id as WorkoutSetId,
    workoutId: "w2" as WorkoutId,
    exerciseId,
    order: 1,
    weight,
    weightUnit: "kg",
    reps,
    createdAt: "2026-01-08T00:00:00.000Z",
    updatedAt: "2026-01-08T00:00:00.000Z",
  };
}

describe("buildWorkoutSummary", () => {
  const workout: Workout = {
    id: "w2" as WorkoutId,
    userId,
    startedAt: "2026-01-08T18:00:00.000Z",
    completedAt: "2026-01-08T18:45:00.000Z",
    createdAt: "2026-01-08T18:00:00.000Z",
    updatedAt: "2026-01-08T18:45:00.000Z",
  };

  it("computes duration, totals, PRs, and the previous-session comparison", () => {
    const sets = [set("s1", 105, 5), set("s2", 105, 5)];
    const priorSets = [set("p1", 100, 5)];
    const previousSessionSets = [set("prev1", 95, 5), set("prev2", 95, 5)];

    const summary = buildWorkoutSummary({
      workout,
      sets,
      totalPlannedExercises: 3,
      priorSets,
      previousSessionSets,
    });

    expect(summary.durationMinutes).toBe(45);
    expect(summary.totalSets).toBe(2);
    expect(summary.totalVolume).toBe(1050);
    expect(summary.exercisesCompleted).toBe(1);
    expect(summary.totalPlannedExercises).toBe(3);
    // A heavier top set at the same rep count is both a weight PR and an
    // estimated-1RM PR.
    expect(summary.personalRecords).toHaveLength(2);
    expect(summary.previousSessionComparison).toEqual({ totalVolume: 950, totalSets: 2 });
  });

  it("has a null comparison when there is no previous session", () => {
    const summary = buildWorkoutSummary({
      workout,
      sets: [set("s1", 100, 5)],
      totalPlannedExercises: 1,
      priorSets: [],
      previousSessionSets: null,
    });
    expect(summary.previousSessionComparison).toBeNull();
    expect(summary.personalRecords).toEqual([]);
  });

  it("reports 0 duration for an unfinished workout", () => {
    const unfinished: Workout = { ...workout, completedAt: undefined };
    const summary = buildWorkoutSummary({
      workout: unfinished,
      sets: [],
      totalPlannedExercises: 1,
      priorSets: [],
      previousSessionSets: null,
    });
    expect(summary.durationMinutes).toBe(0);
  });
});
