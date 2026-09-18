/** Branded string type so different id kinds cannot be mixed up by accident. */
export type Id<Brand extends string> = string & { readonly __brand: Brand };

export type UserId = Id<"UserId">;
export type ProgramId = Id<"ProgramId">;
export type WorkoutDayId = Id<"WorkoutDayId">;
export type ExerciseId = Id<"ExerciseId">;
export type ProgramExerciseId = Id<"ProgramExerciseId">;
export type WorkoutId = Id<"WorkoutId">;
export type WorkoutSetId = Id<"WorkoutSetId">;
export type ConditioningSessionId = Id<"ConditioningSessionId">;
export type MobilitySessionId = Id<"MobilitySessionId">;
export type BodyMeasurementId = Id<"BodyMeasurementId">;
export type ProgressPhotoId = Id<"ProgressPhotoId">;
