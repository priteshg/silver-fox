import { describe, expect, it } from "vitest";
import { getPreviousPerformance, summarizeExerciseHistory } from "../logic/progression";
import type { Workout } from "../entities/workout";
import type { WorkoutSet } from "../entities/workoutSet";
import type { ExerciseId, UserId, WorkoutId, WorkoutSetId } from "@silver-fox/types";

const userId = "user_1" as UserId;
const exerciseId = "exercise_1" as ExerciseId;

function makeWorkout(id: string, startedAt: string, completedAt: string): Workout {
  return {
    id: id as WorkoutId,
    userId,
    startedAt,
    completedAt,
    createdAt: startedAt,
    updatedAt: completedAt,
  };
}

function makeSet(workoutId: string, id: string, weight: number, reps: number): WorkoutSet {
  return {
    id: id as WorkoutSetId,
    workoutId: workoutId as WorkoutId,
    exerciseId,
    order: 1,
    weight,
    weightUnit: "kg",
    reps,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

describe("summarizeExerciseHistory", () => {
  it("summarizes volume and estimated 1RM per workout, newest first", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      makeWorkout("w2", "2026-01-08T00:00:00.000Z", "2026-01-08T01:00:00.000Z"),
    ];
    const sets = [makeSet("w1", "s1", 100, 5), makeSet("w2", "s2", 105, 5)];

    const history = summarizeExerciseHistory(workouts, sets, exerciseId);

    expect(history).toHaveLength(2);
    expect(history[0]?.workoutId).toBe("w2");
    expect(history[0]?.totalVolume).toBe(525);
    expect(history[0]?.estimatedOneRepMax).toBeGreaterThan(0);
  });

  it("returns 0 estimated 1RM for an unweighted set", () => {
    const workouts = [makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z")];
    const sets = [makeSet("w1", "s1", 0, 12)];

    const history = summarizeExerciseHistory(workouts, sets, exerciseId);
    expect(history[0]?.estimatedOneRepMax).toBe(0);
  });

  it("ignores workouts with no sets for the exercise", () => {
    const workouts = [makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z")];
    expect(summarizeExerciseHistory(workouts, [], exerciseId)).toEqual([]);
  });
});

describe("getPreviousPerformance", () => {
  it("returns the most recent summary", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      makeWorkout("w2", "2026-01-08T00:00:00.000Z", "2026-01-08T01:00:00.000Z"),
    ];
    const sets = [makeSet("w1", "s1", 100, 5), makeSet("w2", "s2", 105, 5)];

    expect(getPreviousPerformance(workouts, sets, exerciseId)?.workoutId).toBe("w2");
  });

  it("returns null when there is no history", () => {
    expect(getPreviousPerformance([], [], exerciseId)).toBeNull();
  });
});
