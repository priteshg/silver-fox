import type { MobilityFocus, MobilitySession } from "@silver-fox/domain";
import { createId } from "@silver-fox/types";
import { mobilitySessionsStorageSchema } from "@silver-fox/validation";
import { LOCAL_USER_ID } from "../../data/currentUser";
import { readJson, writeJson } from "../storage/asyncStore";
import { STORAGE_KEYS } from "../storage/keys";

export async function listMobilitySessions(): Promise<MobilitySession[]> {
  const raw = await readJson(STORAGE_KEYS.mobilitySessions);
  if (raw === null) return [];
  const parsed = mobilitySessionsStorageSchema.safeParse(raw);
  return parsed.success ? (parsed.data as MobilitySession[]) : [];
}

export async function logMobilitySession(input: {
  focus: MobilityFocus;
  durationMinutes: number;
  date: string;
  notes?: string;
}): Promise<MobilitySession> {
  const sessions = await listMobilitySessions();
  const now = new Date().toISOString();
  const session: MobilitySession = {
    id: createId("mobility") as MobilitySession["id"],
    userId: LOCAL_USER_ID,
    focus: input.focus,
    date: input.date,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(STORAGE_KEYS.mobilitySessions, [...sessions, session]);
  return session;
}
