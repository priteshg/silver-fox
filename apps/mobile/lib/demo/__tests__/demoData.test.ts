import { describe, expect, it } from "vitest";
import { findMostRecentPersonalRecord, suggestNextLoad } from "@silver-fox/domain";
import {
  DEMO_PROFILE,
  DEMO_PROGRAM_DETAIL,
  DEMO_WORKOUTS,
  DEMO_WORKOUT_SETS,
  findProgramExercise,
} from "../demoData";

describe("demo data", () => {
  it("is built entirely from the local Foundation 40+ catalogue — a realistic, non-empty programme", () => {
    expect(DEMO_PROGRAM_DETAIL.program.name).toBe("Foundation 40+");
    expect(DEMO_PROGRAM_DETAIL.days.length).toBeGreaterThanOrEqual(3);
    for (const day of DEMO_PROGRAM_DETAIL.days) {
      expect(day.exercises.length).toBeGreaterThan(0);
    }
  });

  it("has 4-6 fabricated completed workouts, per the product decision", () => {
    expect(DEMO_WORKOUTS.length).toBeGreaterThanOrEqual(4);
    expect(DEMO_WORKOUTS.length).toBeLessThanOrEqual(6);
    for (const workout of DEMO_WORKOUTS) {
      expect(workout.completedAt).toBeDefined();
    }
  });

  it("spans roughly 2-3 weeks of history", () => {
    const timestamps = DEMO_WORKOUTS.map((w) => new Date(w.startedAt).getTime());
    const spanDays = (Math.max(...timestamps) - Math.min(...timestamps)) / (24 * 60 * 60 * 1000);
    expect(spanDays).toBeGreaterThanOrEqual(10);
    expect(spanDays).toBeLessThanOrEqual(21);
  });

  it("every fabricated set references a real exercise on its workout's day", () => {
    for (const set of DEMO_WORKOUT_SETS) {
      const workout = DEMO_WORKOUTS.find((w) => w.id === set.workoutId);
      expect(workout, `set ${set.id} references a missing workout`).toBeDefined();
      const day = DEMO_PROGRAM_DETAIL.days.find((d) => d.day.id === workout?.workoutDayId);
      expect(day?.exercises.some((e) => e.exerciseId === set.exerciseId), `${set.exerciseId} should be on ${day?.day.name}`).toBe(
        true,
      );
    }
  });

  it("has a filled-in example profile, not an empty one", () => {
    expect(DEMO_PROFILE.displayName).toBeTruthy();
    expect(DEMO_PROFILE.age).toBeGreaterThan(0);
    expect(DEMO_PROFILE.trainingExperience).toBeTruthy();
    expect(DEMO_PROFILE.goals?.length).toBeGreaterThan(0);
    expect(DEMO_PROFILE.activeProgramId).toBe(DEMO_PROGRAM_DETAIL.program.id);
  });

  it("produces a genuine, computed personal record — per PRODUCT_FOUNDATION.md's demo content requirement", () => {
    const pr = findMostRecentPersonalRecord(DEMO_WORKOUTS, DEMO_WORKOUT_SETS);
    expect(pr).not.toBeNull();
  });

  it("Bench Press's fabricated history is shaped to produce a genuine progression suggestion", () => {
    const target = findProgramExercise("Push", "ex_bench_press");
    const benchSets = DEMO_WORKOUT_SETS.filter((s) => s.exerciseId === "ex_bench_press").sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1,
    );
    const lastThree = benchSets.slice(-3);
    const suggestion = suggestNextLoad({
      previousSets: lastThree.map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir })),
      targetRepRangeLow: target.targetRepRangeLow,
      targetRepRangeHigh: target.targetRepRangeHigh,
      targetRir: target.targetRir,
    });
    expect(suggestion.action).toBe("increase");
    expect(suggestion.suggestedWeight).not.toBeNull();
  });

  it("is deterministic — importing it twice produces identical content", async () => {
    const again = await import("../demoData");
    expect(again.DEMO_WORKOUTS).toEqual(DEMO_WORKOUTS);
    expect(again.DEMO_PROFILE).toEqual(DEMO_PROFILE);
  });
});
