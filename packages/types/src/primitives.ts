/** An ISO-8601 timestamp string, e.g. "2026-09-18T12:00:00.000Z". */
export type ISODateString = string;

/** Weight unit used throughout workout logging and nutrition. */
export type WeightUnit = "kg" | "lb";

/** Fields common to every persisted entity. */
export interface Timestamped {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
