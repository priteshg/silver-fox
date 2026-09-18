import type { ProgramId, Timestamped, WorkoutDayId } from "@silver-fox/types";

/**
 * What a strength day trains. Drives categorisation elsewhere (e.g. the
 * weekly training view) instead of matching on the day's free-text `name`,
 * which a user can rename freely.
 */
export type StrengthFocus = "push" | "pull" | "legs" | "upper" | "lower" | "full_body" | "other";

export interface WorkoutDay extends Timestamped {
  id: WorkoutDayId;
  programId: ProgramId;
  name: string;
  order: number;
  focus: StrengthFocus;
}
