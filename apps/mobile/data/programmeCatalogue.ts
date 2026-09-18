import type {
  Program,
  ProgramExercise,
  ProgrammeCategory,
  ProgrammeDifficulty,
  ProgrammeGoal,
  StrengthFocus,
  WorkoutDay,
} from "@silver-fox/domain";
import type { ExerciseId, ProgramExerciseId, ProgramId, WorkoutDayId } from "@silver-fox/types";
import { LOCAL_USER_ID } from "./currentUser";

const SEED_DATE = "2026-01-01T00:00:00.000Z";

/**
 * Tempo conventions used across the catalogue — deliberately different by
 * programme purpose rather than decorative. Compounds get a controlled
 * eccentric with a brief pause; isolation work is a steadier 2-0-2-0; the
 * over-40, lower-fatigue and return-to-training programmes use a slower
 * 4-1-1-0 eccentric throughout, trading a little load for more time under
 * control and less momentum through the joints.
 */
const TEMPO_COMPOUND = "3-1-1-0";
const TEMPO_ISOLATION = "2-0-2-0";
const TEMPO_JOINT_FRIENDLY = "4-1-1-0";

interface ExerciseSlot {
  exerciseId: string;
  sets: number;
  repLow: number;
  repHigh: number;
  rir?: number;
  rest: number;
  tempo?: string;
  warmupSets?: number;
  notes?: string;
}

interface DayInput {
  name: string;
  focus: StrengthFocus;
  exercises: ExerciseSlot[];
}

interface ProgrammeInput {
  id: string;
  name: string;
  description: string;
  category: ProgrammeCategory;
  targetAudience: string;
  difficulty: ProgrammeDifficulty;
  daysPerWeek: number;
  sessionMinLow: number;
  sessionMinHigh: number;
  primaryGoal: ProgrammeGoal;
  secondaryGoals?: ProgrammeGoal[];
  philosophy: string;
  progressionMethod: string;
  deloadStrategy: string;
  days: DayInput[];
}

function buildProgramme(input: ProgrammeInput): {
  program: Program;
  days: WorkoutDay[];
  programExercises: ProgramExercise[];
} {
  const program: Program = {
    id: input.id as ProgramId,
    ownerId: LOCAL_USER_ID,
    name: input.name,
    description: input.description,
    category: input.category,
    targetAudience: input.targetAudience,
    difficulty: input.difficulty,
    daysPerWeek: input.daysPerWeek,
    estimatedSessionMinutesLow: input.sessionMinLow,
    estimatedSessionMinutesHigh: input.sessionMinHigh,
    primaryGoal: input.primaryGoal,
    secondaryGoals: input.secondaryGoals,
    philosophy: input.philosophy,
    progressionMethod: input.progressionMethod,
    deloadStrategy: input.deloadStrategy,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  };

  const days: WorkoutDay[] = [];
  const programExercises: ProgramExercise[] = [];

  input.days.forEach((dayInput, dayIndex) => {
    const dayId = `${input.id}_day${dayIndex}`;
    days.push({
      id: dayId as WorkoutDayId,
      programId: input.id as ProgramId,
      name: dayInput.name,
      order: dayIndex,
      focus: dayInput.focus,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    });
    dayInput.exercises.forEach((slot, exerciseIndex) => {
      programExercises.push({
        id: `${dayId}_pe${exerciseIndex}` as ProgramExerciseId,
        workoutDayId: dayId as WorkoutDayId,
        exerciseId: slot.exerciseId as ExerciseId,
        order: exerciseIndex,
        targetSets: slot.sets,
        targetRepRangeLow: slot.repLow,
        targetRepRangeHigh: slot.repHigh,
        targetRir: slot.rir,
        restSeconds: slot.rest,
        tempo: slot.tempo,
        warmupSets: slot.warmupSets,
        notes: slot.notes,
        createdAt: SEED_DATE,
        updatedAt: SEED_DATE,
      });
    });
  });

  return { program, days, programExercises };
}

export const SEED_PROGRAM_ID = "program_ppl" as ProgramId;

const CATALOGUE = [
  // ---------------------------------------------------------------------
  // PUSH / PULL / LEGS
  // ---------------------------------------------------------------------
  buildProgramme({
    id: "program_ppl",
    name: "Foundation 40+",
    description: "Build strength. Keep muscle. Move well. Stay capable.",
    category: "push_pull_legs",
    targetAudience: "Adults 40+ who want one dependable, sustainable strength and physique split.",
    difficulty: "intermediate",
    daysPerWeek: 3,
    sessionMinLow: 45,
    sessionMinHigh: 55,
    primaryGoal: "strength_and_muscle",
    secondaryGoals: ["longevity"],
    philosophy: "A balanced push/pull/legs split run at 1-3 RIR — enough effort to drive progress, never so much that recovery suffers.",
    progressionMethod: "When every set of an exercise reaches the top of its rep range at the target RIR, add a small amount of weight next session.",
    deloadStrategy: "Every 6-8 weeks, or any week that feels unusually heavy, cut sets by roughly a third and stay at the same weight.",
    days: [
      {
        name: "Push",
        focus: "push",
        exercises: [
          { exerciseId: "ex_bench_press", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_incline_dumbbell_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lateral_raise", sets: 3, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_tricep_pushdown", sets: 3, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Pull",
        focus: "pull",
        exercises: [
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 120, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_seated_cable_row", sets: 2, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_face_pull", sets: 3, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_bicep_curl", sets: 3, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Legs",
        focus: "legs",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 6, repHigh: 10, rir: 3, rest: 180, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_curl", sets: 3, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_leg_extension", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_calf_raise", sets: 3, repLow: 8, repHigh: 15, rir: 2, rest: 45, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_plank", sets: 2, repLow: 30, repHigh: 60, rir: 2, rest: 45 },
        ],
      },
    ],
  }),

  buildProgramme({
    id: "program_ppl_hypertrophy_4",
    name: "PPL Hypertrophy 4",
    description: "A four-day rotation through push, pull and legs for more total muscle-building volume.",
    category: "push_pull_legs",
    targetAudience: "Lifters who can commit to four sessions a week and want more size, not just strength.",
    difficulty: "intermediate",
    daysPerWeek: 4,
    sessionMinLow: 50,
    sessionMinHigh: 60,
    primaryGoal: "build_muscle",
    philosophy: "The three days rotate continuously (Push, Pull, Legs, Push, then Pull, Legs, Push... ) rather than resetting each week, so frequency stays high without a punishing 6-day schedule.",
    progressionMethod: "Per exercise: once every set reaches the top of the rep range at target RIR, add weight next time that exercise comes up.",
    deloadStrategy: "Every 5-6 weeks, take a lighter week at roughly 60% of normal sets before resuming.",
    days: [
      {
        name: "Push",
        focus: "push",
        exercises: [
          { exerciseId: "ex_bench_press", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_incline_dumbbell_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_cable_fly", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lateral_raise", sets: 3, repLow: 12, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_tricep_pushdown", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Pull",
        focus: "pull",
        exercises: [
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 120, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_seated_cable_row", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 90, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_face_pull", sets: 3, repLow: 12, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_bicep_curl", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_hammer_curl", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Legs",
        focus: "legs",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 180, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_press", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 120, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_leg_curl", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_leg_extension", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_calf_raise", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 45, tempo: TEMPO_ISOLATION },
        ],
      },
    ],
  }),

  buildProgramme({
    id: "program_ppl_lower_fatigue_3",
    name: "Lower-Fatigue PPL 3",
    description: "The same push/pull/legs shape with meaningfully less systemic fatigue — fewer heavy leg sets and no spinal-loading hinge.",
    category: "push_pull_legs",
    targetAudience: "Anyone who likes PPL's structure but finds three heavy leg days a week too draining to sustain.",
    difficulty: "beginner",
    daysPerWeek: 3,
    sessionMinLow: 40,
    sessionMinHigh: 50,
    primaryGoal: "longevity",
    secondaryGoals: ["general_fitness"],
    philosophy: "Genuinely reduced fatigue, not just a renamed programme: the leg day drops the barbell squat and Romanian deadlift entirely in favour of machine work at a higher RIR, and every day runs one fewer exercise.",
    progressionMethod: "Add weight once every set hits the top of the rep range at target RIR — the same rule as Foundation 40+, applied more conservatively.",
    deloadStrategy: "Deloads are rarely needed here given the lower baseline fatigue; take one if progress stalls for 2+ weeks in a row.",
    days: [
      {
        name: "Push",
        focus: "push",
        exercises: [
          { exerciseId: "ex_machine_chest_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_incline_dumbbell_press", sets: 2, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_dumbbell_shoulder_press", sets: 2, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lateral_raise", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Pull",
        focus: "pull",
        exercises: [
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_chest_supported_row", sets: 2, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_face_pull", sets: 2, repLow: 12, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_bicep_curl", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Legs",
        focus: "legs",
        exercises: [
          { exerciseId: "ex_leg_press", sets: 3, repLow: 10, repHigh: 15, rir: 3, rest: 120, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_leg_curl", sets: 2, repLow: 10, repHigh: 15, rir: 3, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_leg_extension", sets: 2, repLow: 10, repHigh: 15, rir: 3, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_calf_raise", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 45, tempo: TEMPO_ISOLATION },
        ],
      },
    ],
  }),

  buildProgramme({
    id: "program_ppl_strength_hypertrophy_3",
    name: "Strength + Hypertrophy PPL 3",
    description: "Each day opens with a low-rep strength set on the main lift, then finishes with hypertrophy-range accessory work.",
    category: "push_pull_legs",
    targetAudience: "Experienced lifters who want a strength top set without giving up hypertrophy volume.",
    difficulty: "advanced",
    daysPerWeek: 3,
    sessionMinLow: 55,
    sessionMinHigh: 65,
    primaryGoal: "strength_and_muscle",
    philosophy: "Mixed rep ranges within a session — a heavier, lower-rep main lift for strength, then higher-rep accessories for muscle — rather than one rep range for the whole day.",
    progressionMethod: "The main lift progresses on load once it hits the top of its range at 2 RIR; accessories progress on reps first, then load.",
    deloadStrategy: "Every 6 weeks, drop the main lift's top set and run accessories only at reduced volume for one week.",
    days: [
      {
        name: "Push",
        focus: "push",
        exercises: [
          { exerciseId: "ex_bench_press", sets: 3, repLow: 4, repHigh: 6, rir: 2, rest: 180, tempo: TEMPO_COMPOUND, warmupSets: 3, notes: "Main strength lift for the day." },
          { exerciseId: "ex_incline_dumbbell_press", sets: 3, repLow: 8, repHigh: 12, rir: 1, rest: 120, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_cable_fly", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_lateral_raise", sets: 3, repLow: 12, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_tricep_pushdown", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Pull",
        focus: "pull",
        exercises: [
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 5, repHigh: 8, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 3, notes: "Main strength lift for the day." },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 1, rest: 120, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_seated_cable_row", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 90, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_face_pull", sets: 3, repLow: 12, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_bicep_curl", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Legs",
        focus: "legs",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 4, repHigh: 6, rir: 2, rest: 210, tempo: TEMPO_COMPOUND, warmupSets: 3, notes: "Main strength lift for the day." },
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 6, repHigh: 8, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_press", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 90, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_leg_curl", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_calf_raise", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 45, tempo: TEMPO_ISOLATION },
        ],
      },
    ],
  }),

  // ---------------------------------------------------------------------
  // FULL BODY
  // ---------------------------------------------------------------------
  buildProgramme({
    id: "program_full_body_foundation_3",
    name: "Foundation Full Body 3",
    description: "A classic three-day full-body split — each session trains every major movement pattern once.",
    category: "full_body",
    targetAudience: "Anyone who wants maximum results from exactly three weekly sessions.",
    difficulty: "beginner",
    daysPerWeek: 3,
    sessionMinLow: 45,
    sessionMinHigh: 55,
    primaryGoal: "strength_and_muscle",
    philosophy: "Training every muscle group three times a week on a modest per-session volume beats hammering it once with a huge one.",
    progressionMethod: "Per exercise: once every set reaches the top of the rep range at target RIR, add weight next time it appears.",
    deloadStrategy: "Every 6-8 weeks, cut sets by about a third for one week at the same weights.",
    days: [
      {
        name: "Full Body A",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_bench_press", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 120, tempo: TEMPO_COMPOUND, warmupSets: 1 },
          { exerciseId: "ex_seated_cable_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_curl", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_lateral_raise", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_bicep_curl", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Full Body B",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_incline_dumbbell_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_walking_lunge", sets: 2, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lateral_raise", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_tricep_pushdown", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Full Body C",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_leg_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND, warmupSets: 1 },
          { exerciseId: "ex_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_curl", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_calf_raise", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 45, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_hammer_curl", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
    ],
  }),

  buildProgramme({
    id: "program_full_body_hypertrophy_3",
    name: "Full Body Hypertrophy 3",
    description: "The full-body pattern with higher rep ranges and extra isolation work for more total muscle stimulus.",
    category: "full_body",
    targetAudience: "Lifters chasing size who still only have three days a week to train.",
    difficulty: "intermediate",
    daysPerWeek: 3,
    sessionMinLow: 50,
    sessionMinHigh: 60,
    primaryGoal: "build_muscle",
    philosophy: "Slightly higher volume per session than Foundation Full Body, with an isolation exercise added to each pattern.",
    progressionMethod: "Add weight per exercise once every set reaches the top of the range at target RIR; isolation work can chase reps for longer before adding load.",
    deloadStrategy: "Every 5-6 weeks, run one week at roughly 60% of normal sets.",
    days: [
      {
        name: "Full Body A",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_incline_dumbbell_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_curl", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_cable_fly", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_hammer_curl", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Full Body B",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_bench_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_extension", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_lateral_raise", sets: 3, repLow: 12, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_overhead_tricep_extension", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Full Body C",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_leg_press", sets: 3, repLow: 10, repHigh: 15, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_dumbbell_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 100, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_seated_cable_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_walking_lunge", sets: 2, repLow: 10, repHigh: 12, rir: 1, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_face_pull", sets: 2, repLow: 12, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_calf_raise", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 45, tempo: TEMPO_ISOLATION },
        ],
      },
    ],
  }),

  buildProgramme({
    id: "program_full_body_minimalist_3",
    name: "Full Body Minimalist 3",
    description: "The shortest, simplest way to touch every muscle group three times a week — four exercises a session, no filler.",
    category: "full_body",
    targetAudience: "Busy professionals who need real results from roughly 30 minutes, three times a week.",
    difficulty: "beginner",
    daysPerWeek: 3,
    sessionMinLow: 30,
    sessionMinHigh: 35,
    primaryGoal: "busy_professional",
    secondaryGoals: ["general_fitness"],
    philosophy: "Four compound movements per session, no accessories — if a set doesn't earn its place, it isn't in this programme.",
    progressionMethod: "Add weight once every set of an exercise reaches the top of the rep range at target RIR.",
    deloadStrategy: "The volume here is already low; if progress stalls for 2+ weeks, take a week at the same weight for fewer sets rather than deloading load.",
    days: [
      {
        name: "Full Body A",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_goblet_squat", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_machine_chest_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_plank", sets: 2, repLow: 30, repHigh: 60, rir: 2, rest: 45 },
        ],
      },
      {
        name: "Full Body B",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_leg_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_dumbbell_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_seated_cable_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_plank", sets: 2, repLow: 30, repHigh: 60, rir: 2, rest: 45 },
        ],
      },
      {
        name: "Full Body C",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_dumbbell_rdl", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_dumbbell_bench_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_plank", sets: 2, repLow: 30, repHigh: 60, rir: 2, rest: 45 },
        ],
      },
    ],
  }),

  buildProgramme({
    id: "program_full_body_over40_3",
    name: "Full Body Over-40 3",
    description: "A joint-friendly full-body split: slower eccentrics, machine-first exercise selection, and more reps in reserve.",
    category: "full_body",
    targetAudience: "Adults 40+ prioritising recovery and joint health without giving up meaningful strength work.",
    difficulty: "beginner",
    daysPerWeek: 3,
    sessionMinLow: 45,
    sessionMinHigh: 55,
    primaryGoal: "longevity",
    secondaryGoals: ["general_fitness"],
    philosophy: "Every choice here is deliberate: machine and dumbbell variations instead of maximal barbell lifts, a slower 4-1-1-0 tempo throughout, 2-3 RIR on everything, and no exercise pushed toward failure.",
    progressionMethod: "Add weight only once every set reaches the top of the range while the tempo and RIR both stay on target — reps and control come first.",
    deloadStrategy: "Every 4th week, reduce every exercise by one set regardless of how training has felt — a built-in, not reactive, deload.",
    days: [
      {
        name: "Full Body A",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_leg_press", sets: 3, repLow: 10, repHigh: 15, rir: 3, rest: 120, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_machine_chest_press", sets: 3, repLow: 8, repHigh: 12, rir: 3, rest: 120, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_leg_curl", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_lateral_raise", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Full Body B",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_dumbbell_rdl", sets: 3, repLow: 8, repHigh: 12, rir: 3, rest: 120, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_dumbbell_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 3, rest: 100, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_walking_lunge", sets: 2, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_face_pull", sets: 2, repLow: 12, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Full Body C",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_goblet_squat", sets: 3, repLow: 10, repHigh: 15, rir: 3, rest: 120, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_dumbbell_bench_press", sets: 3, repLow: 8, repHigh: 12, rir: 3, rest: 120, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_seated_cable_row", sets: 3, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_hip_thrust", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_calf_raise", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 45, tempo: TEMPO_ISOLATION },
        ],
      },
    ],
  }),

  buildProgramme({
    id: "program_full_body_rotating_4",
    name: "Full Body 4 (Rotating)",
    description: "Two full-body sessions, alternating A/B/A/B, for four sessions a week without repeating a day back-to-back.",
    category: "full_body",
    targetAudience: "Lifters who want full-body frequency with more weekly volume than three days allows.",
    difficulty: "intermediate",
    daysPerWeek: 4,
    sessionMinLow: 45,
    sessionMinHigh: 55,
    primaryGoal: "strength_and_muscle",
    philosophy: "Only two templates, rotating continuously — every muscle group is trained twice a week without needing a rigid calendar schedule.",
    progressionMethod: "Add weight per exercise once every set reaches the top of the range at target RIR.",
    deloadStrategy: "Every 6 weeks, run one week at roughly two-thirds of normal sets.",
    days: [
      {
        name: "Full Body A",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_bench_press", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 120, tempo: TEMPO_COMPOUND, warmupSets: 1 },
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_curl", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_lateral_raise", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Full Body B",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 100, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_extension", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_bicep_curl", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_tricep_pushdown", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
    ],
  }),

  // ---------------------------------------------------------------------
  // UPPER / LOWER
  // ---------------------------------------------------------------------
  buildProgramme({
    id: "program_upper_lower_strength_4",
    name: "Upper/Lower Strength 4",
    description: "Two upper and two lower sessions a week, built around lower-rep, higher-effort main lifts.",
    category: "upper_lower",
    targetAudience: "Intermediate-to-advanced lifters chasing strength who can train four days a week.",
    difficulty: "advanced",
    daysPerWeek: 4,
    sessionMinLow: 50,
    sessionMinHigh: 60,
    primaryGoal: "get_stronger",
    secondaryGoals: ["build_muscle"],
    philosophy: "Each muscle group is trained twice a week at a lower rep range (5-8) so more total weight can be handled without excessive fatigue.",
    progressionMethod: "Add weight once every set of the main lift reaches the top of the range at 2 RIR.",
    deloadStrategy: "Every 4-5 weeks, take a lighter week at the same weights for roughly two-thirds of normal sets.",
    days: [
      {
        name: "Upper A",
        focus: "upper",
        exercises: [
          { exerciseId: "ex_bench_press", sets: 3, repLow: 5, repHigh: 8, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 5, repHigh: 8, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 1 },
          { exerciseId: "ex_shoulder_press", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_bicep_curl", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Lower A",
        focus: "lower",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 5, repHigh: 8, rir: 2, rest: 180, tempo: TEMPO_COMPOUND, warmupSets: 3 },
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 6, repHigh: 8, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 1 },
          { exerciseId: "ex_leg_curl", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_calf_raise", sets: 3, repLow: 8, repHigh: 12, rir: 1, rest: 45, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Upper B",
        focus: "upper",
        exercises: [
          { exerciseId: "ex_incline_dumbbell_press", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_seated_cable_row", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_dumbbell_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 100, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_face_pull", sets: 3, repLow: 12, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_tricep_pushdown", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Lower B",
        focus: "lower",
        exercises: [
          { exerciseId: "ex_leg_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_hip_thrust", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_extension", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_walking_lunge", sets: 2, repLow: 8, repHigh: 12, rir: 1, rest: 90, tempo: TEMPO_COMPOUND },
        ],
      },
    ],
  }),

  buildProgramme({
    id: "program_upper_lower_hypertrophy_4",
    name: "Upper/Lower Hypertrophy 4",
    description: "The same four-day upper/lower shape, tuned for muscle: higher reps, more isolation, more total sets.",
    category: "upper_lower",
    targetAudience: "Lifters who want the classic 10-20 weekly sets per muscle group without training more than four days.",
    difficulty: "intermediate",
    daysPerWeek: 4,
    sessionMinLow: 55,
    sessionMinHigh: 65,
    primaryGoal: "build_muscle",
    philosophy: "Twice-weekly frequency per muscle group at 8-15 reps sits in the sweet spot the hypertrophy literature keeps landing on.",
    progressionMethod: "Add weight per exercise once every set reaches the top of the range at target RIR; isolation work can chase reps before adding load.",
    deloadStrategy: "Every 5-6 weeks, run one week at roughly 60% of normal sets.",
    days: [
      {
        name: "Upper A",
        focus: "upper",
        exercises: [
          { exerciseId: "ex_incline_dumbbell_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lateral_raise", sets: 3, repLow: 12, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_cable_fly", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_hammer_curl", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_tricep_pushdown", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Lower A",
        focus: "lower",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_leg_curl", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_leg_extension", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_calf_raise", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 45, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Upper B",
        focus: "upper",
        exercises: [
          { exerciseId: "ex_machine_chest_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_dumbbell_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 100, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_face_pull", sets: 2, repLow: 12, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_bicep_curl", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_overhead_tricep_extension", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Lower B",
        focus: "lower",
        exercises: [
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND, warmupSets: 1 },
          { exerciseId: "ex_leg_press", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 90, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_walking_lunge", sets: 2, repLow: 10, repHigh: 12, rir: 1, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_calf_raise", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 45, tempo: TEMPO_ISOLATION },
        ],
      },
    ],
  }),

  buildProgramme({
    id: "program_upper_lower_rotating_3",
    name: "Rotating Upper/Lower 3",
    description: "Three sessions a week rotating continuously through Upper and Lower, so the pattern shifts week to week without any scheduling.",
    category: "upper_lower",
    targetAudience: "Anyone who wants upper/lower's frequency benefits but can only commit to three days.",
    difficulty: "intermediate",
    daysPerWeek: 3,
    sessionMinLow: 45,
    sessionMinHigh: 55,
    primaryGoal: "strength_and_muscle",
    philosophy: "Only two templates rotate continuously, so one week runs Upper/Lower/Upper and the next runs Lower/Upper/Lower — everything still gets trained roughly twice a week on average.",
    progressionMethod: "Add weight per exercise once every set reaches the top of the range at target RIR.",
    deloadStrategy: "Every 6-8 weeks, cut sets by about a third for one week at the same weights.",
    days: [
      {
        name: "Upper",
        focus: "upper",
        exercises: [
          { exerciseId: "ex_bench_press", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_shoulder_press", sets: 2, repLow: 8, repHigh: 12, rir: 2, rest: 100, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_seated_cable_row", sets: 2, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_bicep_curl", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_tricep_pushdown", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Lower",
        focus: "lower",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 180, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_curl", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_leg_extension", sets: 2, repLow: 10, repHigh: 15, rir: 1, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_calf_raise", sets: 3, repLow: 10, repHigh: 15, rir: 1, rest: 45, tempo: TEMPO_ISOLATION },
        ],
      },
    ],
  }),

  // ---------------------------------------------------------------------
  // HYBRID
  // ---------------------------------------------------------------------
  buildProgramme({
    id: "program_strength_longevity_hybrid_3",
    name: "Strength + Longevity Hybrid 3",
    description: "A full-body strength foundation with unilateral, carry and anti-rotation work layered in for lasting functional capacity.",
    category: "hybrid",
    targetAudience: "Adults who want to stay strong, stable and mobile for the long term, not just add plates to the bar.",
    difficulty: "intermediate",
    daysPerWeek: 3,
    sessionMinLow: 45,
    sessionMinHigh: 55,
    primaryGoal: "longevity",
    secondaryGoals: ["general_fitness", "strength_and_muscle"],
    philosophy: "Every session pairs a heavy bilateral lift with a unilateral or stability movement — strength and the capability to use it are trained together, not treated as separate goals.",
    progressionMethod: "Main lifts progress on load once every set hits the top of the range at target RIR; carries and stability work progress on time or distance first.",
    deloadStrategy: "Every 6 weeks, reduce every exercise by one set for a week regardless of how training has felt.",
    days: [
      {
        name: "Full Body A",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_barbell_squat", sets: 3, repLow: 6, repHigh: 10, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 2 },
          { exerciseId: "ex_chest_supported_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_dumbbell_shoulder_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 100, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_farmers_carry", sets: 3, repLow: 20, repHigh: 40, rest: 90 },
          { exerciseId: "ex_plank", sets: 2, repLow: 30, repHigh: 60, rir: 2, rest: 45 },
        ],
      },
      {
        name: "Full Body B",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_romanian_deadlift", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 150, tempo: TEMPO_COMPOUND, warmupSets: 1 },
          { exerciseId: "ex_incline_dumbbell_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_lat_pulldown", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 100, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_walking_lunge", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_pallof_press", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
        ],
      },
      {
        name: "Full Body C",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_hip_thrust", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_machine_chest_press", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 120, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_seated_cable_row", sets: 3, repLow: 8, repHigh: 12, rir: 2, rest: 90, tempo: TEMPO_COMPOUND },
          { exerciseId: "ex_leg_curl", sets: 2, repLow: 10, repHigh: 15, rir: 2, rest: 60, tempo: TEMPO_ISOLATION },
          { exerciseId: "ex_farmers_carry", sets: 3, repLow: 20, repHigh: 40, rest: 90 },
        ],
      },
    ],
  }),

  // ---------------------------------------------------------------------
  // GOAL-SPECIFIC
  // ---------------------------------------------------------------------
  buildProgramme({
    id: "program_return_to_training_3",
    name: "Return-to-Training Full Body 3",
    description: "A deliberately conservative full-body restart — three or four exercises a session, generous rest, higher RIR throughout.",
    category: "full_body",
    targetAudience: "Anyone coming back to the gym after a long break, an injury, or an illness.",
    difficulty: "beginner",
    daysPerWeek: 3,
    sessionMinLow: 30,
    sessionMinHigh: 40,
    primaryGoal: "return_to_training",
    secondaryGoals: ["general_fitness"],
    philosophy: "The first job after time away is rebuilding the habit and the movement pattern, not chasing numbers — every set here is left comfortably short of hard.",
    progressionMethod: "Spend the first two weeks simply repeating comfortable weights to rebuild consistency, then apply the normal rule: add weight once every set reaches the top of the range at target RIR.",
    deloadStrategy: "Not applicable in the usual sense — the whole programme runs at a deload-like intensity until a normal programme feels appropriate again.",
    days: [
      {
        name: "Full Body A",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_goblet_squat", sets: 2, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_machine_chest_press", sets: 2, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_lat_pulldown", sets: 2, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_plank", sets: 2, repLow: 20, repHigh: 40, rir: 3, rest: 45 },
        ],
      },
      {
        name: "Full Body B",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_dumbbell_rdl", sets: 2, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_dumbbell_shoulder_press", sets: 2, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_seated_cable_row", sets: 2, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_plank", sets: 2, repLow: 20, repHigh: 40, rir: 3, rest: 45 },
        ],
      },
      {
        name: "Full Body C",
        focus: "full_body",
        exercises: [
          { exerciseId: "ex_leg_press", sets: 2, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_incline_dumbbell_press", sets: 2, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_chest_supported_row", sets: 2, repLow: 8, repHigh: 12, rir: 3, rest: 90, tempo: TEMPO_JOINT_FRIENDLY },
          { exerciseId: "ex_plank", sets: 2, repLow: 20, repHigh: 40, rir: 3, rest: 45 },
        ],
      },
    ],
  }),
];

export const SEED_PROGRAMS: Program[] = CATALOGUE.map((entry) => entry.program);
export const SEED_WORKOUT_DAYS: WorkoutDay[] = CATALOGUE.flatMap((entry) => entry.days);
export const SEED_PROGRAM_EXERCISES: ProgramExercise[] = CATALOGUE.flatMap((entry) => entry.programExercises);
