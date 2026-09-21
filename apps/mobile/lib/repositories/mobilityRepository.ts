import type { MobilityFocus, MobilitySession } from "@silver-fox/domain";
import { createId } from "@silver-fox/types";
import { getCurrentUserIdSync } from "../supabase/auth";
import { supabase } from "../supabase/client";

interface MobilitySessionRow {
  id: string;
  user_id: string;
  focus: string;
  date: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToDomain(row: MobilitySessionRow): MobilitySession {
  return {
    id: row.id as MobilitySession["id"],
    userId: row.user_id as MobilitySession["userId"],
    focus: row.focus as MobilityFocus,
    date: row.date,
    durationMinutes: row.duration_minutes,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMobilitySessions(): Promise<MobilitySession[]> {
  const { data, error } = await supabase.from("mobility_sessions").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDomain);
}

export async function logMobilitySession(input: {
  focus: MobilityFocus;
  durationMinutes: number;
  date: string;
  notes?: string;
}): Promise<MobilitySession> {
  const userId = getCurrentUserIdSync();
  const now = new Date().toISOString();
  const session: MobilitySession = {
    id: createId("mobility") as MobilitySession["id"],
    userId,
    focus: input.focus,
    date: input.date,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabase.from("mobility_sessions").insert({
    id: session.id,
    user_id: userId,
    focus: session.focus,
    date: session.date,
    duration_minutes: session.durationMinutes,
    notes: session.notes ?? null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
  return session;
}
