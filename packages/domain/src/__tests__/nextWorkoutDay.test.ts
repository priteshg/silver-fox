import { describe, expect, it } from "vitest";
import { selectNextWorkoutDay } from "../logic/nextWorkoutDay";
import type { WorkoutDay } from "../entities/workoutDay";
import type { ProgramId, WorkoutDayId } from "@silver-fox/types";

const programId = "program_1" as ProgramId;
const now = "2026-01-01T00:00:00.000Z";

function day(id: string, order: number): WorkoutDay {
  return { id: id as WorkoutDayId, programId, name: id, order, createdAt: now, updatedAt: now };
}

describe("selectNextWorkoutDay", () => {
  const days = [day("push", 0), day("pull", 1), day("legs", 2)];

  it("returns the first day when there is no history", () => {
    expect(selectNextWorkoutDay(days, null)?.id).toBe("push");
  });

  it("returns the day after the last completed one", () => {
    expect(selectNextWorkoutDay(days, "push" as WorkoutDayId)?.id).toBe("pull");
  });

  it("wraps back to the first day after the last", () => {
    expect(selectNextWorkoutDay(days, "legs" as WorkoutDayId)?.id).toBe("push");
  });

  it("falls back to the first day if the last completed day no longer exists", () => {
    expect(selectNextWorkoutDay(days, "deleted-day" as WorkoutDayId)?.id).toBe("push");
  });

  it("returns null when the programme has no days", () => {
    expect(selectNextWorkoutDay([], null)).toBeNull();
  });
});
