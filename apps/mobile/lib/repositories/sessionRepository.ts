import type { WorkoutSession } from "@silver-fox/domain";
import { readJson, removeKey, writeJson } from "../storage/asyncStore";
import { STORAGE_KEYS } from "../storage/keys";

/**
 * The active session is disposable state: if it fails to parse we simply
 * drop it (the user restarts the workout) rather than validating its full
 * shape with Zod.
 */
export async function loadActiveSession(): Promise<WorkoutSession | null> {
  const raw = await readJson(STORAGE_KEYS.activeSession);
  if (raw === null || typeof raw !== "object") return null;
  const session = raw as WorkoutSession;
  if (typeof session.id !== "string" || !Array.isArray(session.exercises)) return null;
  return session;
}

export async function saveActiveSession(session: WorkoutSession): Promise<void> {
  await writeJson(STORAGE_KEYS.activeSession, session);
}

export async function clearActiveSession(): Promise<void> {
  await removeKey(STORAGE_KEYS.activeSession);
}
