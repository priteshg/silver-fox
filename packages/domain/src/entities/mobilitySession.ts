import type { ISODateString, MobilitySessionId, Timestamped, UserId } from "@silver-fox/types";

/** A short mobility or general-recovery session — distinct from a rest day, which has no session at all. */
export type MobilityFocus = "hips" | "thoracic_spine" | "shoulders" | "ankles" | "general";

export interface MobilitySession extends Timestamped {
  id: MobilitySessionId;
  userId: UserId;
  focus: MobilityFocus;
  /** The calendar day this happened, not necessarily when it was logged. */
  date: ISODateString;
  durationMinutes: number;
  notes?: string;
}
