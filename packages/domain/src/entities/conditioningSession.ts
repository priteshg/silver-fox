import type { ConditioningSessionId, ISODateString, Timestamped, UserId } from "@silver-fox/types";

/** Cardiovascular/conditioning work — logged separately from strength sets, which don't apply here. */
export type ConditioningType = "zone2" | "running" | "cycling" | "walking" | "intervals" | "other";

export interface ConditioningSession extends Timestamped {
  id: ConditioningSessionId;
  userId: UserId;
  type: ConditioningType;
  /** The calendar day this happened, not necessarily when it was logged. */
  date: ISODateString;
  durationMinutes: number;
  notes?: string;
}
