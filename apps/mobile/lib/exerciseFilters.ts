import type { Equipment, Exercise, MuscleGroup } from "@silver-fox/domain";

export interface ExerciseFilterCriteria {
  query?: string;
  muscleGroup?: MuscleGroup | null;
  equipment?: Equipment | null;
}

/** Shared by the exercise library and the programme-builder's exercise picker. */
export function filterExercises(exercises: Exercise[], criteria: ExerciseFilterCriteria): Exercise[] {
  const query = criteria.query?.trim().toLowerCase() ?? "";
  return exercises.filter((exercise) => {
    const matchesQuery = query.length === 0 || exercise.name.toLowerCase().includes(query);
    const matchesMuscle = !criteria.muscleGroup || exercise.primaryMuscleGroup === criteria.muscleGroup;
    const matchesEquipment = !criteria.equipment || exercise.equipment === criteria.equipment;
    return matchesQuery && matchesMuscle && matchesEquipment;
  });
}
