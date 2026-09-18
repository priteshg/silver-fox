import type {
  ISODateString,
  ProgramId,
  Timestamped,
  UserId,
  WorkoutDayId,
  WorkoutId,
} from "@silver-fox/types";

export interface Workout extends Timestamped {
  id: WorkoutId;
  userId: UserId;
  programId?: ProgramId;
  /**
   * Which programme day this followed, kept even if that day is later
   * renamed or removed — historical workouts never change once saved.
   */
  workoutDayId?: WorkoutDayId;
  startedAt: ISODateString;
  completedAt?: ISODateString;
}
