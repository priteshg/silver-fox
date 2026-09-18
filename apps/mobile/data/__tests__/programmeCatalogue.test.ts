import { validateProgrammeCatalogue } from "@silver-fox/domain";
import { describe, expect, it } from "vitest";
import { SEED_EXERCISES } from "../seedExercises";
import { SEED_PROGRAM_EXERCISES, SEED_PROGRAMS, SEED_WORKOUT_DAYS } from "../programmeCatalogue";

describe("seeded programme catalogue", () => {
  it("has no referential or structural integrity issues", () => {
    const issues = validateProgrammeCatalogue({
      programs: SEED_PROGRAMS,
      days: SEED_WORKOUT_DAYS,
      programExercises: SEED_PROGRAM_EXERCISES,
      exercises: SEED_EXERCISES,
    });
    expect(issues).toEqual([]);
  });

  it("has no duplicate programme names", () => {
    const names = SEED_PROGRAMS.map((program) => program.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every programme the metadata the catalogue and discovery UI depend on", () => {
    for (const program of SEED_PROGRAMS) {
      expect(program.category, `${program.name} is missing a category`).toBeDefined();
      expect(program.difficulty, `${program.name} is missing a difficulty`).toBeDefined();
      expect(program.primaryGoal, `${program.name} is missing a primary goal`).toBeDefined();
      expect(program.daysPerWeek, `${program.name} is missing daysPerWeek`).toBeGreaterThan(0);
      expect(program.estimatedSessionMinutesLow, `${program.name} is missing a session length`).toBeGreaterThan(0);
      expect(program.progressionMethod, `${program.name} is missing a progression method`).toBeTruthy();
      expect(program.deloadStrategy, `${program.name} is missing a deload strategy`).toBeTruthy();
    }
  });

  it("gives every working set a tempo, unless the exercise is a timed hold or carry", () => {
    const exerciseById = new Map(SEED_EXERCISES.map((exercise) => [exercise.id, exercise]));
    const missingTempo = SEED_PROGRAM_EXERCISES.filter((pe) => {
      const exercise = exerciseById.get(pe.exerciseId);
      const isTimedHoldOrCarry = exercise?.repUnit === "seconds";
      return !isTimedHoldOrCarry && !pe.tempo;
    });
    expect(missingTempo).toEqual([]);
  });

  it("never defines more day templates than the programme's declared sessions per week", () => {
    // Rotating programmes deliberately define fewer templates than weekly
    // sessions (e.g. 3 PPL templates rotating across 4 weekly sessions) —
    // that's expected. What would be a real scheduling problem is the
    // reverse: more distinct templates than a week has room to visit.
    for (const program of SEED_PROGRAMS) {
      const dayCount = SEED_WORKOUT_DAYS.filter((day) => day.programId === program.id).length;
      expect(dayCount, `${program.name} has no workout days`).toBeGreaterThan(0);
      expect(
        dayCount,
        `${program.name} declares ${program.daysPerWeek}/week but defines ${dayCount} day templates`,
      ).toBeLessThanOrEqual(program.daysPerWeek!);
    }
  });
});
