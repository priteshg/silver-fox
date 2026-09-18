import type { Workout, WorkoutSet } from "@silver-fox/domain";
import type { ExerciseId, UserId, WorkoutId, WorkoutSetId } from "@silver-fox/types";
import { beforeEach, describe, expect, it } from "vitest";
import { resetMockAsyncStorage } from "../../../test/mockAsyncStorage";
import { listWorkouts, listWorkoutSets, saveCompletedWorkout } from "../workoutRepository";

const userId = "user_1" as UserId;
const exerciseId = "exercise_1" as ExerciseId;
const now = "2026-01-01T00:00:00.000Z";

function workout(id: string): Workout {
  return {
    id: id as WorkoutId,
    userId,
    startedAt: now,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function workoutSet(id: string, workoutId: string): WorkoutSet {
  return {
    id: id as WorkoutSetId,
    workoutId: workoutId as WorkoutId,
    exerciseId,
    order: 1,
    weight: 100,
    weightUnit: "kg",
    reps: 5,
    createdAt: now,
    updatedAt: now,
  };
}

describe("workoutRepository", () => {
  beforeEach(() => {
    resetMockAsyncStorage();
  });

  it("returns empty history when nothing has been saved", async () => {
    expect(await listWorkouts()).toEqual([]);
    expect(await listWorkoutSets()).toEqual([]);
  });

  it("persists a completed workout and its sets", async () => {
    const w = workout("w1");
    const sets = [workoutSet("s1", "w1")];
    await saveCompletedWorkout(w, sets);

    expect(await listWorkouts()).toEqual([w]);
    expect(await listWorkoutSets()).toEqual(sets);
  });

  it("appends new workouts without overwriting existing history", async () => {
    await saveCompletedWorkout(workout("w1"), [workoutSet("s1", "w1")]);
    await saveCompletedWorkout(workout("w2"), [workoutSet("s2", "w2")]);

    const workouts = await listWorkouts();
    const sets = await listWorkoutSets();
    expect(workouts.map((w) => w.id)).toEqual(["w1", "w2"]);
    expect(sets.map((s) => s.id)).toEqual(["s1", "s2"]);
  });
});
