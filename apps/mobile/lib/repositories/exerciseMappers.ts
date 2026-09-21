import type { Equipment, Exercise, ExerciseDifficulty, Laterality, MovementPattern, MuscleGroup } from "@silver-fox/domain";
import type { ExerciseId, UserId } from "@silver-fox/types";

/**
 * Pure row<->domain mapping for `exercises`, kept free of any Supabase
 * client import so it can run in plain scripts (e.g. the seed-data
 * generator) and be unit tested without a live or mocked connection.
 */
export interface ExerciseRow {
  id: string;
  name: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  equipment: string;
  laterality: string;
  rep_unit: string;
  difficulty: string | null;
  movement_pattern: string | null;
  description: string;
  why: string | null;
  instructions: string[];
  setup: string | null;
  execution: string | null;
  breathing_cue: string | null;
  form_cues: string[];
  common_mistakes: string[];
  progression_guidance: string | null;
  regression_or_substitution: string | null;
  recommended_rest_seconds: number | null;
  is_custom: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Maps one exercise row + its resolved substitution ids onto the `Exercise` domain shape. */
export function exerciseRowToDomain(row: ExerciseRow, substitutionExerciseIds: string[]): Exercise {
  return {
    id: row.id as ExerciseId,
    name: row.name,
    primaryMuscleGroup: row.primary_muscle_group as MuscleGroup,
    secondaryMuscleGroups: row.secondary_muscle_groups as MuscleGroup[],
    equipment: row.equipment as Equipment,
    laterality: row.laterality as Laterality,
    repUnit: row.rep_unit as "reps" | "seconds",
    difficulty: (row.difficulty as ExerciseDifficulty | null) ?? undefined,
    movementPattern: (row.movement_pattern as MovementPattern | null) ?? undefined,
    description: row.description,
    why: row.why ?? undefined,
    instructions: row.instructions,
    setup: row.setup ?? undefined,
    execution: row.execution ?? undefined,
    breathingCue: row.breathing_cue ?? undefined,
    formCues: row.form_cues,
    commonMistakes: row.common_mistakes,
    progressionGuidance: row.progression_guidance ?? undefined,
    regressionOrSubstitution: row.regression_or_substitution ?? undefined,
    substitutionExerciseIds: substitutionExerciseIds.length
      ? (substitutionExerciseIds as ExerciseId[])
      : undefined,
    recommendedRestSeconds: row.recommended_rest_seconds ?? undefined,
    // No media_assets rows exist yet — hydration will join media_asset_id
    // once the first real asset is created. See supabase/migrations for the
    // table this will eventually read from.
    media: undefined,
    isCustom: row.is_custom,
    ownerId: (row.owner_id as UserId | null) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Reverse of `exerciseRowToDomain`. */
export function exerciseToRow(exercise: Exercise): ExerciseRow {
  return {
    id: exercise.id,
    name: exercise.name,
    primary_muscle_group: exercise.primaryMuscleGroup,
    secondary_muscle_groups: exercise.secondaryMuscleGroups,
    equipment: exercise.equipment,
    laterality: exercise.laterality,
    rep_unit: exercise.repUnit ?? "reps",
    difficulty: exercise.difficulty ?? null,
    movement_pattern: exercise.movementPattern ?? null,
    description: exercise.description,
    why: exercise.why ?? null,
    instructions: exercise.instructions,
    setup: exercise.setup ?? null,
    execution: exercise.execution ?? null,
    breathing_cue: exercise.breathingCue ?? null,
    form_cues: exercise.formCues,
    common_mistakes: exercise.commonMistakes,
    progression_guidance: exercise.progressionGuidance ?? null,
    regression_or_substitution: exercise.regressionOrSubstitution ?? null,
    recommended_rest_seconds: exercise.recommendedRestSeconds ?? null,
    is_custom: exercise.isCustom,
    owner_id: exercise.ownerId ?? null,
    created_at: exercise.createdAt,
    updated_at: exercise.updatedAt,
  };
}
