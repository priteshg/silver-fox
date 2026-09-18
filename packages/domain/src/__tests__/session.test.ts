import { describe, expect, it } from "vitest";
import {
  addSet,
  completeSet,
  createSession,
  finishSession,
  hasLoggedAnySet,
  removeSet,
  uncompleteSet,
  updateExerciseTarget,
} from "../session/session";
import type { ExerciseId, UserId, WorkoutDayId } from "@silver-fox/types";

const userId = "user_1" as UserId;
const exerciseId = "exercise_1" as ExerciseId;

function buildSession() {
  return createSession({
    userId,
    dayName: "Push",
    exercises: [
      {
        exerciseId,
        order: 0,
        targetSets: 3,
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
      },
    ],
  });
}

describe("createSession", () => {
  it("pre-populates the target number of empty sets", () => {
    const session = buildSession();
    expect(session.exercises).toHaveLength(1);
    expect(session.exercises[0]?.sets).toHaveLength(3);
    expect(session.exercises[0]?.sets.every((set) => !set.completed)).toBe(true);
  });
});

describe("addSet / removeSet", () => {
  it("adds a set with the next set number", () => {
    const session = buildSession();
    const exerciseId0 = session.exercises[0]!.id;
    const updated = addSet(session, exerciseId0);
    expect(updated.exercises[0]?.sets).toHaveLength(4);
    expect(updated.exercises[0]?.sets[3]?.setNumber).toBe(4);
  });

  it("removes a set and renumbers the rest", () => {
    const session = buildSession();
    const sessionExercise = session.exercises[0]!;
    const removed = removeSet(session, sessionExercise.id, sessionExercise.sets[0]!.id);
    expect(removed.exercises[0]?.sets).toHaveLength(2);
    expect(removed.exercises[0]?.sets.map((set) => set.setNumber)).toEqual([1, 2]);
  });
});

describe("completeSet / uncompleteSet", () => {
  it("marks a set complete with logged values", () => {
    const session = buildSession();
    const sessionExercise = session.exercises[0]!;
    const setId = sessionExercise.sets[0]!.id;
    const updated = completeSet(session, sessionExercise.id, setId, {
      weight: 60,
      reps: 10,
      rir: 2,
    });
    const set = updated.exercises[0]?.sets.find((s) => s.id === setId);
    expect(set?.completed).toBe(true);
    expect(set?.weight).toBe(60);
    expect(set?.completedAt).toBeDefined();
  });

  it("can revert a completed set", () => {
    const session = buildSession();
    const sessionExercise = session.exercises[0]!;
    const setId = sessionExercise.sets[0]!.id;
    const completed = completeSet(session, sessionExercise.id, setId, { weight: 60, reps: 10 });
    const reverted = uncompleteSet(completed, sessionExercise.id, setId);
    expect(reverted.exercises[0]?.sets.find((s) => s.id === setId)?.completed).toBe(false);
  });
});

describe("updateExerciseTarget", () => {
  it("updates the target for the current session only", () => {
    const session = buildSession();
    const sessionExercise = session.exercises[0]!;
    const updated = updateExerciseTarget(session, sessionExercise.id, {
      targetRepRangeLow: 6,
      targetRepRangeHigh: 10,
    });
    expect(updated.exercises[0]?.targetRepRangeLow).toBe(6);
    expect(updated.exercises[0]?.targetRepRangeHigh).toBe(10);
  });
});

describe("finishSession", () => {
  it("only persists completed sets", () => {
    const session = buildSession();
    const sessionExercise = session.exercises[0]!;
    const withOneDone = completeSet(session, sessionExercise.id, sessionExercise.sets[0]!.id, {
      weight: 60,
      reps: 10,
      rir: 2,
    });

    const { workout, sets } = finishSession(withOneDone, "kg");

    expect(workout.completedAt).toBeDefined();
    expect(sets).toHaveLength(1);
    expect(sets[0]?.weight).toBe(60);
    expect(sets[0]?.weightUnit).toBe("kg");
    expect(sets[0]?.workoutId).toBe(workout.id);
  });

  it("carries the workoutDayId through onto the persisted workout", () => {
    const dayId = "day_1" as WorkoutDayId;
    const session = createSession({
      userId,
      workoutDayId: dayId,
      dayName: "Push",
      exercises: [
        { exerciseId, order: 0, targetSets: 1, targetRepRangeLow: 8, targetRepRangeHigh: 12 },
      ],
    });
    const { workout } = finishSession(session, "kg");
    expect(workout.workoutDayId).toBe(dayId);
  });
});

describe("hasLoggedAnySet", () => {
  it("is false for a fresh session and true once a set is completed", () => {
    const session = buildSession();
    expect(hasLoggedAnySet(session)).toBe(false);
    const sessionExercise = session.exercises[0]!;
    const updated = completeSet(session, sessionExercise.id, sessionExercise.sets[0]!.id, {
      weight: 20,
      reps: 15,
    });
    expect(hasLoggedAnySet(updated)).toBe(true);
  });
});
