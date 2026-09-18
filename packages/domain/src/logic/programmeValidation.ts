import type { Exercise } from "../entities/exercise";
import type { Program } from "../entities/program";
import type { ProgramExercise } from "../entities/programExercise";
import type { WorkoutDay } from "../entities/workoutDay";

export interface ProgrammeValidationIssue {
  message: string;
  programId?: string;
}

/**
 * Referential and structural integrity checks for the whole programme
 * catalogue — the kind of mistake that's easy to make by hand across many
 * seeded programmes (a typo'd exercise id, a day with nothing in it, two
 * programmes sharing an id) and that TypeScript's required fields can't
 * catch because they're about cross-record consistency, not shape.
 */
export function validateProgrammeCatalogue(params: {
  programs: Program[];
  days: WorkoutDay[];
  programExercises: ProgramExercise[];
  exercises: Exercise[];
}): ProgrammeValidationIssue[] {
  const { programs, days, programExercises, exercises } = params;
  const issues: ProgrammeValidationIssue[] = [];

  const programIds = new Set<string>();
  for (const program of programs) {
    if (programIds.has(program.id)) {
      issues.push({ message: `Duplicate programme id "${program.id}".`, programId: program.id });
    }
    programIds.add(program.id);
  }

  const dayIds = new Set<string>();
  for (const day of days) {
    if (dayIds.has(day.id)) {
      issues.push({ message: `Duplicate workout day id "${day.id}".`, programId: day.programId });
    }
    dayIds.add(day.id);
    if (!programIds.has(day.programId)) {
      issues.push({
        message: `Workout day "${day.name}" (${day.id}) references a programme that doesn't exist: "${day.programId}".`,
        programId: day.programId,
      });
    }
  }

  const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
  const programExerciseIds = new Set<string>();
  const daysWithExercises = new Set<string>();
  for (const pe of programExercises) {
    if (programExerciseIds.has(pe.id)) {
      issues.push({ message: `Duplicate programme-exercise id "${pe.id}".` });
    }
    programExerciseIds.add(pe.id);

    if (!dayIds.has(pe.workoutDayId)) {
      issues.push({ message: `Programme exercise "${pe.id}" references a workout day that doesn't exist: "${pe.workoutDayId}".` });
    } else {
      daysWithExercises.add(pe.workoutDayId);
    }

    if (!exerciseIds.has(pe.exerciseId)) {
      issues.push({ message: `Programme exercise "${pe.id}" references an exercise that doesn't exist: "${pe.exerciseId}".` });
    }

    if (pe.targetSets <= 0) {
      issues.push({ message: `Programme exercise "${pe.id}" has ${pe.targetSets} target sets — must be at least 1.` });
    }
    if (pe.targetRepRangeLow > pe.targetRepRangeHigh) {
      issues.push({
        message: `Programme exercise "${pe.id}" has an inverted rep range: ${pe.targetRepRangeLow}-${pe.targetRepRangeHigh}.`,
      });
    }
  }

  for (const day of days) {
    if (!daysWithExercises.has(day.id)) {
      issues.push({ message: `Workout day "${day.name}" (${day.id}) has no exercises.`, programId: day.programId });
    }
  }

  const daysByProgram = new Map<string, WorkoutDay[]>();
  for (const day of days) {
    const list = daysByProgram.get(day.programId) ?? [];
    list.push(day);
    daysByProgram.set(day.programId, list);
  }
  for (const program of programs) {
    if (!(daysByProgram.get(program.id) ?? []).length) {
      issues.push({ message: `Programme "${program.name}" (${program.id}) has no workout days.`, programId: program.id });
    }
  }

  return issues;
}
