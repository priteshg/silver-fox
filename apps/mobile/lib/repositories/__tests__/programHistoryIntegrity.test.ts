import type { Workout, WorkoutSet } from "@silver-fox/domain";
import type { ExerciseId, UserId, WorkoutId, WorkoutSetId } from "@silver-fox/types";
import { beforeEach, describe, expect, it } from "vitest";
import { resetFakeDb } from "../../../test/fakeSupabase";
import { fakeSupabaseDb } from "../../../vitest.setup";
import { createProgram, deleteProgram, updateProgramInfo } from "../programRepository";
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

describe("editing or deleting a programme does not touch historical workouts", () => {
  beforeEach(() => {
    resetFakeDb(fakeSupabaseDb);
  });

  it("survives renaming a programme", async () => {
    const program = await createProgram({ name: "Original Name", dayNames: ["Push"] });
    await saveCompletedWorkout(workout("w1"), [workoutSet("s1", "w1")]);

    await updateProgramInfo(program.program.id, { name: "Renamed" });

    expect(await listWorkouts()).toHaveLength(1);
    expect(await listWorkoutSets()).toHaveLength(1);
  });

  it("survives deleting the programme entirely", async () => {
    const program = await createProgram({ name: "Temp Programme", dayNames: ["Push"] });
    await saveCompletedWorkout(workout("w1"), [workoutSet("s1", "w1")]);

    await deleteProgram(program.program.id);

    const workouts = await listWorkouts();
    const sets = await listWorkoutSets();
    expect(workouts).toHaveLength(1);
    expect(workouts[0]?.id).toBe("w1");
    expect(sets).toHaveLength(1);
  });
});
