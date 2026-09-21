import type { ConditioningSession, ConditioningType } from "@silver-fox/domain";
import { createId } from "@silver-fox/types";
import { getCurrentUserIdSync } from "../supabase/auth";
import { supabase } from "../supabase/client";

interface ConditioningSessionRow {
  id: string;
  user_id: string;
  type: string;
  date: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToDomain(row: ConditioningSessionRow): ConditioningSession {
  return {
    id: row.id as ConditioningSession["id"],
    userId: row.user_id as ConditioningSession["userId"],
    type: row.type as ConditioningType,
    date: row.date,
    durationMinutes: row.duration_minutes,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listConditioningSessions(): Promise<ConditioningSession[]> {
  const { data, error } = await supabase.from("conditioning_sessions").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDomain);
}

export async function logConditioningSession(input: {
  type: ConditioningType;
  durationMinutes: number;
  date: string;
  notes?: string;
}): Promise<ConditioningSession> {
  const userId = getCurrentUserIdSync();
  const now = new Date().toISOString();
  const session: ConditioningSession = {
    id: createId("conditioning") as ConditioningSession["id"],
    userId,
    type: input.type,
    date: input.date,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabase.from("conditioning_sessions").insert({
    id: session.id,
    user_id: userId,
    type: session.type,
    date: session.date,
    duration_minutes: session.durationMinutes,
    notes: session.notes ?? null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
  return session;
}
