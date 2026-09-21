import type {
  Program,
  ProgramExercise,
  ProgrammeCategory,
  ProgrammeDifficulty,
  ProgrammeGoal,
  StrengthFocus,
  WorkoutDay,
} from "@silver-fox/domain";
import type { ProgramId, UserId, WorkoutDayId } from "@silver-fox/types";

/**
 * Pure row<->domain mapping for programs/program_sessions/program_exercises,
 * kept free of any Supabase client import so it can run in plain scripts
 * (e.g. the seed-data generator) and be unit tested without a live or
 * mocked connection.
 */
export interface ProgramRow {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  target_audience: string | null;
  difficulty: string | null;
  days_per_week: number | null;
  estimated_session_minutes_low: number | null;
  estimated_session_minutes_high: number | null;
  primary_goal: string | null;
  secondary_goals: string[] | null;
  philosophy: string | null;
  progression_method: string | null;
  deload_strategy: string | null;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgramSessionRow {
  id: string;
  program_id: string;
  name: string;
  order: number;
  focus: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramExerciseRow {
  id: string;
  session_id: string;
  exercise_id: string;
  order: number;
  target_sets: number;
  target_rep_range_low: number;
  target_rep_range_high: number;
  target_rir: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  warmup_sets: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function programRowToDomain(row: ProgramRow): Program {
  return {
    id: row.id as ProgramId,
    ownerId: (row.owner_id as UserId | null) ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    category: (row.category as ProgrammeCategory | null) ?? undefined,
    targetAudience: row.target_audience ?? undefined,
    difficulty: (row.difficulty as ProgrammeDifficulty | null) ?? undefined,
    daysPerWeek: row.days_per_week ?? undefined,
    estimatedSessionMinutesLow: row.estimated_session_minutes_low ?? undefined,
    estimatedSessionMinutesHigh: row.estimated_session_minutes_high ?? undefined,
    primaryGoal: (row.primary_goal as ProgrammeGoal | null) ?? undefined,
    secondaryGoals: (row.secondary_goals as ProgrammeGoal[] | null) ?? undefined,
    philosophy: row.philosophy ?? undefined,
    progressionMethod: row.progression_method ?? undefined,
    deloadStrategy: row.deload_strategy ?? undefined,
    isCustom: row.is_custom,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function dayRowToDomain(row: ProgramSessionRow): WorkoutDay {
  return {
    id: row.id as WorkoutDayId,
    programId: row.program_id as ProgramId,
    name: row.name,
    order: row.order,
    focus: row.focus as StrengthFocus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function programExerciseRowToDomain(row: ProgramExerciseRow): ProgramExercise {
  return {
    id: row.id as ProgramExercise["id"],
    workoutDayId: row.session_id as WorkoutDayId,
    exerciseId: row.exercise_id as ProgramExercise["exerciseId"],
    order: row.order,
    targetSets: row.target_sets,
    targetRepRangeLow: row.target_rep_range_low,
    targetRepRangeHigh: row.target_rep_range_high,
    targetRir: row.target_rir ?? undefined,
    restSeconds: row.rest_seconds ?? undefined,
    tempo: row.tempo ?? undefined,
    warmupSets: row.warmup_sets ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Reverse of `programRowToDomain` — shared by createProgram() and the seed-data scripts/fixtures. */
export function programToRow(program: Program): ProgramRow {
  return {
    id: program.id,
    owner_id: program.ownerId ?? null,
    name: program.name,
    description: program.description ?? null,
    category: program.category ?? null,
    target_audience: program.targetAudience ?? null,
    difficulty: program.difficulty ?? null,
    days_per_week: program.daysPerWeek ?? null,
    estimated_session_minutes_low: program.estimatedSessionMinutesLow ?? null,
    estimated_session_minutes_high: program.estimatedSessionMinutesHigh ?? null,
    primary_goal: program.primaryGoal ?? null,
    secondary_goals: program.secondaryGoals ?? null,
    philosophy: program.philosophy ?? null,
    progression_method: program.progressionMethod ?? null,
    deload_strategy: program.deloadStrategy ?? null,
    is_custom: program.isCustom ?? false,
    created_at: program.createdAt,
    updated_at: program.updatedAt,
  };
}

/** Reverse of `dayRowToDomain`. */
export function dayToRow(day: WorkoutDay): ProgramSessionRow {
  return {
    id: day.id,
    program_id: day.programId,
    name: day.name,
    order: day.order,
    focus: day.focus,
    created_at: day.createdAt,
    updated_at: day.updatedAt,
  };
}

/** Reverse of `programExerciseRowToDomain`. */
export function programExerciseToRow(pe: ProgramExercise): ProgramExerciseRow {
  return {
    id: pe.id,
    session_id: pe.workoutDayId,
    exercise_id: pe.exerciseId,
    order: pe.order,
    target_sets: pe.targetSets,
    target_rep_range_low: pe.targetRepRangeLow,
    target_rep_range_high: pe.targetRepRangeHigh,
    target_rir: pe.targetRir ?? null,
    rest_seconds: pe.restSeconds ?? null,
    tempo: pe.tempo ?? null,
    warmup_sets: pe.warmupSets ?? null,
    notes: pe.notes ?? null,
    created_at: pe.createdAt,
    updated_at: pe.updatedAt,
  };
}
