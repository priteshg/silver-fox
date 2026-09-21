import type { ExerciseId, Timestamped, UserId } from "@silver-fox/types";
import type { ExerciseMedia } from "./exerciseMedia";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "core"
  | "full_body";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "other";

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * A small, constrained set chosen for substitution matching, not academic
 * completeness. "isolation" deliberately covers every single-joint movement
 * regardless of which joint or muscle — that distinction is already carried
 * by `primaryMuscleGroup`, so a second axis for it would be redundant. See
 * EXERCISE_SUBSTITUTION_SPEC.md §4 for how every exercise in the library
 * maps onto this list.
 */
export type MovementPattern =
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "carry"
  | "rotation"
  | "anti_rotation"
  | "isolation"
  | "other";

/** Whether the exercise trains one side of the body at a time or both together. */
export type Laterality = "unilateral" | "bilateral";

export interface Exercise extends Timestamped {
  id: ExerciseId;
  name: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  equipment: Equipment;
  /** Whether a set's target/logged number means reps or a hold in seconds (e.g. a plank). Defaults to reps. */
  repUnit?: "reps" | "seconds";
  /** How approachable the exercise is technically — not a measure of how hard it is to get sore. */
  difficulty?: ExerciseDifficulty;
  /** The movement it belongs to. Undefined for a custom exercise that hasn't set one — see MovementPattern. */
  movementPattern?: MovementPattern;
  /** Whether it trains one side at a time or both together. Defaults to bilateral for new exercises. */
  laterality: Laterality;
  /** One or two sentences describing the exercise. */
  description: string;
  /** The coaching rationale — why this exercise earns a place in the programme. */
  why?: string;
  /** Ordered step-by-step cues for performing the exercise. Kept for custom, user-authored exercises. */
  instructions: string[];
  /** How to get into position before the first rep. */
  setup?: string;
  /** What to actually do, rep to rep. */
  execution?: string;
  /** A single cue for when to inhale/exhale. */
  breathingCue?: string;
  /** Short cues to keep in mind while performing it, e.g. "Keep your chest up". */
  formCues: string[];
  /** Common errors to watch for, e.g. "Knees caving inward". */
  commonMistakes: string[];
  /** How to know it's time to add weight or reps. */
  progressionGuidance?: string;
  /** An easier or harder variation, or what to do if this movement doesn't suit someone's joints. */
  regressionOrSubstitution?: string;
  /** Structured swap-ins for this exercise — e.g. when a user doesn't have the required equipment. */
  substitutionExerciseIds?: ExerciseId[];
  /** Suggested rest between sets, in seconds. A programme's own rest setting takes precedence. */
  recommendedRestSeconds?: number;
  /** The demonstration asset — see `ExerciseMedia`. Falls back to a placeholder when absent. */
  media?: ExerciseMedia;
  /** False for the built-in library; true for exercises a user created. */
  isCustom: boolean;
  /** Who created this exercise. Undefined for the built-in library. */
  ownerId?: UserId;
}
