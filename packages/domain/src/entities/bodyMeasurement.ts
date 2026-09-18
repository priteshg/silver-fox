import type { BodyMeasurementId, ISODateString, Timestamped, UserId } from "@silver-fox/types";

/**
 * A physique check-in. Every field but the date is optional so a user can
 * log just a weight, just a waist measurement, or all of them together.
 */
export interface BodyMeasurement extends Timestamped {
  id: BodyMeasurementId;
  userId: UserId;
  date: ISODateString;
  weightKg?: number;
  waistCm?: number;
  bodyFatPercent?: number;
}
