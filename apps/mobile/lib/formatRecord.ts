import type { PersonalRecord } from "@silver-fox/domain";

/** The record's new value and what it beat, without the exercise name — e.g. "105 kg (was 100)". */
export function formatRecordDetail(record: PersonalRecord): string {
  if (record.type === "weight") return `${record.value} kg (was ${record.previousBest})`;
  if (record.type === "estimatedOneRepMax") return `${record.value} kg est. 1RM (was ${record.previousBest})`;
  return `${record.value} reps @ ${record.atWeight} kg (was ${record.previousBest})`;
}

/** A short, human line for a personal record — "Exercise: detail". */
export function formatRecordLine(record: PersonalRecord, exerciseName: string): string {
  return `${exerciseName}: ${formatRecordDetail(record)}`;
}
