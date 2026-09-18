import { z } from "zod";
import {
  bodyMeasurementSchema,
  conditioningSessionSchema,
  exerciseSchema,
  mobilitySessionSchema,
  programExerciseSchema,
  programSchema,
  progressPhotoSchema,
  workoutDaySchema,
  workoutSchema,
  workoutSetSchema,
} from "./entities";

/**
 * Validates arrays read back from on-device storage. Used at load time so a
 * corrupted or stale-shaped record is dropped instead of crashing the app.
 */
export const programsStorageSchema = z.array(programSchema);
export const workoutDaysStorageSchema = z.array(workoutDaySchema);
export const programExercisesStorageSchema = z.array(programExerciseSchema);
export const exercisesStorageSchema = z.array(exerciseSchema);
export const workoutsStorageSchema = z.array(workoutSchema);
export const workoutSetsStorageSchema = z.array(workoutSetSchema);
export const conditioningSessionsStorageSchema = z.array(conditioningSessionSchema);
export const mobilitySessionsStorageSchema = z.array(mobilitySessionSchema);
export const bodyMeasurementsStorageSchema = z.array(bodyMeasurementSchema);
export const progressPhotosStorageSchema = z.array(progressPhotoSchema);
