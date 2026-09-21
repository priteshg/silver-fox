import type { Exercise, Program, ProgramExercise, WorkoutDay } from "@silver-fox/domain";
import type { ExerciseId, ProgramExerciseId, ProgramId, UserId, WorkoutDayId } from "@silver-fox/types";
import { describe, expect, it } from "vitest";
import { exerciseRowToDomain, exerciseToRow } from "../exerciseMappers";
import { dayRowToDomain, dayToRow, programExerciseRowToDomain, programExerciseToRow, programRowToDomain, programToRow } from "../programMappers";

const now = "2026-01-01T00:00:00.000Z";

describe("row <-> domain mapping (round trips a value through the shape Postgres would store)", () => {
  it("round-trips a fully-populated custom exercise", () => {
    const exercise: Exercise = {
      id: "ex_1" as ExerciseId,
      name: "Barbell Squat",
      primaryMuscleGroup: "legs",
      secondaryMuscleGroups: ["glutes", "core"],
      equipment: "barbell",
      laterality: "bilateral",
      repUnit: "reps",
      difficulty: "advanced",
      movementPattern: "squat",
      description: "A compound lower-body lift.",
      why: "Builds real-world capability.",
      instructions: ["Unrack the bar.", "Squat down and stand back up."],
      setup: "Set the bar on your upper back.",
      execution: "Brace and descend under control.",
      breathingCue: "Inhale before descending.",
      formCues: ["Keep your chest up"],
      commonMistakes: ["Knees caving inward"],
      progressionGuidance: "Add load once every set hits the top of the range.",
      regressionOrSubstitution: "Goblet squat if a barbell doesn't suit your joints.",
      substitutionExerciseIds: ["ex_2" as ExerciseId, "ex_3" as ExerciseId],
      recommendedRestSeconds: 180,
      isCustom: true,
      ownerId: "user_1" as UserId,
      createdAt: now,
      updatedAt: now,
    };

    const row = exerciseToRow(exercise);
    const { substitutionExerciseIds, ...rest } = exercise;
    expect(exerciseRowToDomain(row, substitutionExerciseIds ?? [])).toEqual({ ...rest, substitutionExerciseIds });
  });

  it("round-trips a built-in exercise with no owner and no optional fields set", () => {
    const exercise: Exercise = {
      id: "ex_4" as ExerciseId,
      name: "Plank",
      primaryMuscleGroup: "core",
      secondaryMuscleGroups: [],
      equipment: "bodyweight",
      laterality: "bilateral",
      description: "An isometric core hold.",
      instructions: ["Hold a straight line from head to heels."],
      formCues: [],
      commonMistakes: [],
      isCustom: false,
      createdAt: now,
      updatedAt: now,
    };

    const row = exerciseToRow(exercise);
    expect(row.owner_id).toBeNull();
    // repUnit has a NOT NULL DEFAULT 'reps' column, so an omitted repUnit
    // comes back explicit rather than undefined — same meaning, materialized.
    expect(exerciseRowToDomain(row, [])).toEqual({ ...exercise, repUnit: "reps" });
  });

  it("round-trips a built-in programme (no owner) and a custom programme (owned)", () => {
    const builtIn: Program = {
      id: "program_ppl" as ProgramId,
      name: "Foundation 40+",
      description: "Push/Pull/Legs for busy 40+ lifters.",
      category: "push_pull_legs",
      targetAudience: "Lifters over 40 who want strength without burnout.",
      difficulty: "intermediate",
      daysPerWeek: 3,
      estimatedSessionMinutesLow: 45,
      estimatedSessionMinutesHigh: 55,
      primaryGoal: "strength_and_muscle",
      secondaryGoals: ["longevity"],
      philosophy: "Consistency over intensity.",
      progressionMethod: "Add load once every set hits the top of the rep range at target RIR.",
      deloadStrategy: "Lighter week every 5-6 weeks.",
      isCustom: false,
      createdAt: now,
      updatedAt: now,
    };
    expect(programRowToDomain(programToRow(builtIn))).toEqual(builtIn);

    const custom: Program = {
      id: "program_custom_1" as ProgramId,
      ownerId: "user_1" as UserId,
      name: "My Programme",
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };
    expect(programRowToDomain(programToRow(custom))).toEqual(custom);
  });

  it("round-trips a programme session (workout day)", () => {
    const day: WorkoutDay = {
      id: "program_ppl_day0" as WorkoutDayId,
      programId: "program_ppl" as ProgramId,
      name: "Push",
      order: 0,
      focus: "push",
      createdAt: now,
      updatedAt: now,
    };
    expect(dayRowToDomain(dayToRow(day))).toEqual(day);
  });

  it("round-trips a fully-populated programme exercise", () => {
    const pe: ProgramExercise = {
      id: "pe_1" as ProgramExerciseId,
      workoutDayId: "program_ppl_day0" as WorkoutDayId,
      exerciseId: "ex_bench_press" as ExerciseId,
      order: 0,
      targetSets: 3,
      targetRepRangeLow: 6,
      targetRepRangeHigh: 10,
      targetRir: 2,
      restSeconds: 90,
      tempo: "3-1-1-0",
      warmupSets: 2,
      notes: "Focus on bar speed off the chest.",
      createdAt: now,
      updatedAt: now,
    };
    expect(programExerciseRowToDomain(programExerciseToRow(pe))).toEqual(pe);
  });
});
