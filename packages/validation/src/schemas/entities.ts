import { z } from "zod";
import { timestampedSchema, weightUnitSchema } from "./common";

export const userSchema = timestampedSchema.extend({
  id: z.string().min(1),
  displayName: z.string().min(1).max(80),
  email: z.string().email(),
  preferredWeightUnit: weightUnitSchema,
});

export const programmeCategorySchema = z.enum(["full_body", "upper_lower", "push_pull_legs", "hybrid"]);

export const programmeGoalSchema = z.enum([
  "build_muscle",
  "get_stronger",
  "strength_and_muscle",
  "recomposition",
  "fat_loss_maintain_muscle",
  "general_fitness",
  "longevity",
  "return_to_training",
  "busy_professional",
]);

export const programmeDifficultySchema = z.enum(["beginner", "intermediate", "advanced"]);

export const programSchema = timestampedSchema.extend({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  category: programmeCategorySchema.optional(),
  targetAudience: z.string().max(300).optional(),
  difficulty: programmeDifficultySchema.optional(),
  daysPerWeek: z.number().int().positive().optional(),
  estimatedSessionMinutesLow: z.number().int().positive().optional(),
  estimatedSessionMinutesHigh: z.number().int().positive().optional(),
  primaryGoal: programmeGoalSchema.optional(),
  secondaryGoals: z.array(programmeGoalSchema).optional(),
  philosophy: z.string().max(500).optional(),
  progressionMethod: z.string().max(500).optional(),
  deloadStrategy: z.string().max(500).optional(),
  isCustom: z.boolean().optional(),
});

export const strengthFocusSchema = z.enum(["push", "pull", "legs", "upper", "lower", "full_body", "other"]);

export const workoutDaySchema = timestampedSchema.extend({
  id: z.string().min(1),
  programId: z.string().min(1),
  name: z.string().min(1).max(80),
  order: z.number().int().nonnegative(),
  focus: strengthFocusSchema,
});

export const muscleGroupSchema = z.enum([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "core",
  "full_body",
]);

export const equipmentSchema = z.enum([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
]);

export const exerciseMediaSchema = z.object({
  type: z.enum(["image", "gif", "video", "placeholder"]),
  url: z.string().optional(),
  altText: z.string().optional(),
});

export const exerciseDifficultySchema = z.enum(["beginner", "intermediate", "advanced"]);

export const exerciseSchema = timestampedSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  primaryMuscleGroup: muscleGroupSchema,
  secondaryMuscleGroups: z.array(muscleGroupSchema),
  equipment: equipmentSchema,
  repUnit: z.enum(["reps", "seconds"]).optional(),
  difficulty: exerciseDifficultySchema.optional(),
  movementPattern: z.string().max(80).optional(),
  description: z.string().max(500),
  why: z.string().max(500).optional(),
  instructions: z.array(z.string().min(1)),
  setup: z.string().max(500).optional(),
  execution: z.string().max(500).optional(),
  breathingCue: z.string().max(200).optional(),
  formCues: z.array(z.string().min(1)),
  commonMistakes: z.array(z.string().min(1)),
  progressionGuidance: z.string().max(500).optional(),
  regressionOrSubstitution: z.string().max(500).optional(),
  substitutionExerciseIds: z.array(z.string().min(1)).optional(),
  recommendedRestSeconds: z.number().int().positive().optional(),
  media: exerciseMediaSchema.optional(),
  isCustom: z.boolean(),
});

export const programExerciseSchema = timestampedSchema.extend({
  id: z.string().min(1),
  workoutDayId: z.string().min(1),
  exerciseId: z.string().min(1),
  order: z.number().int().nonnegative(),
  targetSets: z.number().int().positive(),
  targetRepRangeLow: z.number().int().positive(),
  targetRepRangeHigh: z.number().int().positive(),
  targetRir: z.number().int().min(0).max(10).optional(),
  restSeconds: z.number().int().positive().optional(),
  tempo: z.string().max(20).optional(),
  warmupSets: z.number().int().nonnegative().optional(),
  notes: z.string().max(300).optional(),
});

export const workoutSchema = timestampedSchema.extend({
  id: z.string().min(1),
  userId: z.string().min(1),
  programId: z.string().min(1).optional(),
  workoutDayId: z.string().min(1).optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});

export const workoutSetSchema = timestampedSchema.extend({
  id: z.string().min(1),
  workoutId: z.string().min(1),
  exerciseId: z.string().min(1),
  order: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  weightUnit: weightUnitSchema,
  reps: z.number().int().nonnegative(),
  rir: z.number().min(0).max(10).optional(),
});

export const conditioningTypeSchema = z.enum(["zone2", "running", "cycling", "walking", "intervals", "other"]);

export const conditioningSessionSchema = timestampedSchema.extend({
  id: z.string().min(1),
  userId: z.string().min(1),
  type: conditioningTypeSchema,
  date: z.string(),
  durationMinutes: z.number().positive(),
  notes: z.string().max(500).optional(),
});

export const mobilityFocusSchema = z.enum(["hips", "thoracic_spine", "shoulders", "ankles", "general"]);

export const mobilitySessionSchema = timestampedSchema.extend({
  id: z.string().min(1),
  userId: z.string().min(1),
  focus: mobilityFocusSchema,
  date: z.string(),
  durationMinutes: z.number().positive(),
  notes: z.string().max(500).optional(),
});

export const bodyMeasurementSchema = timestampedSchema.extend({
  id: z.string().min(1),
  userId: z.string().min(1),
  date: z.string(),
  weightKg: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  bodyFatPercent: z.number().min(0).max(100).optional(),
});

export const progressPhotoSchema = timestampedSchema.extend({
  id: z.string().min(1),
  userId: z.string().min(1),
  date: z.string(),
  uri: z.string().min(1),
  note: z.string().max(500).optional(),
});
