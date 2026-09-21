import type { ProgramId, Timestamped, UserId } from "@silver-fox/types";

/** The structural shape of a programme's weekly schedule. */
export type ProgrammeCategory = "full_body" | "upper_lower" | "push_pull_legs" | "hybrid";

export type ProgrammeGoal =
  | "build_muscle"
  | "get_stronger"
  | "strength_and_muscle"
  | "recomposition"
  | "fat_loss_maintain_muscle"
  | "general_fitness"
  | "longevity"
  | "return_to_training"
  | "busy_professional";

export type ProgrammeDifficulty = "beginner" | "intermediate" | "advanced";

export interface Program extends Timestamped {
  id: ProgramId;
  /** Undefined for the built-in catalogue; set for a programme a user created. */
  ownerId?: UserId;
  name: string;
  description?: string;
  /** The weekly structure this programme follows — drives how it's grouped in the catalogue. */
  category?: ProgrammeCategory;
  /** Who this programme is built for, in plain language. */
  targetAudience?: string;
  difficulty?: ProgrammeDifficulty;
  /** How many distinct sessions a week this programme is designed around. */
  daysPerWeek?: number;
  estimatedSessionMinutesLow?: number;
  estimatedSessionMinutesHigh?: number;
  primaryGoal?: ProgrammeGoal;
  secondaryGoals?: ProgrammeGoal[];
  /** The training philosophy in a sentence or two — why this programme is built the way it is. */
  philosophy?: string;
  /** How load should be progressed session to session, in plain language. */
  progressionMethod?: string;
  /** When and how to back off — a deload week, reduced sets, etc. */
  deloadStrategy?: string;
  /** False for the built-in catalogue; true for a programme a user created. Only custom programmes can be deleted. */
  isCustom?: boolean;
}
