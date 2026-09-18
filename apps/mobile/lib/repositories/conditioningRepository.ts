import type { ConditioningSession, ConditioningType } from "@silver-fox/domain";
import { createId } from "@silver-fox/types";
import { conditioningSessionsStorageSchema } from "@silver-fox/validation";
import { LOCAL_USER_ID } from "../../data/currentUser";
import { readJson, writeJson } from "../storage/asyncStore";
import { STORAGE_KEYS } from "../storage/keys";

export async function listConditioningSessions(): Promise<ConditioningSession[]> {
  const raw = await readJson(STORAGE_KEYS.conditioningSessions);
  if (raw === null) return [];
  const parsed = conditioningSessionsStorageSchema.safeParse(raw);
  return parsed.success ? (parsed.data as ConditioningSession[]) : [];
}

export async function logConditioningSession(input: {
  type: ConditioningType;
  durationMinutes: number;
  date: string;
  notes?: string;
}): Promise<ConditioningSession> {
  const sessions = await listConditioningSessions();
  const now = new Date().toISOString();
  const session: ConditioningSession = {
    id: createId("conditioning") as ConditioningSession["id"],
    userId: LOCAL_USER_ID,
    type: input.type,
    date: input.date,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(STORAGE_KEYS.conditioningSessions, [...sessions, session]);
  return session;
}
