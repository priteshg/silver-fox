import type { Equipment, ProgrammeDifficulty, ProgrammeGoal, User } from "@silver-fox/domain";
import type { ProgramId, UserId, WeightUnit } from "@silver-fox/types";
import { getCurrentUserIdSync } from "../supabase/auth";
import { supabase } from "../supabase/client";

interface ProfileRow {
  id: string;
  display_name: string | null;
  email: string | null;
  age: number | null;
  preferred_weight_unit: string;
  training_experience: string | null;
  goals: string[] | null;
  preferred_training_days_per_week: number | null;
  available_equipment: string[] | null;
  active_program_id: string | null;
  created_at: string;
  updated_at: string;
}

function profileRowToDomain(row: ProfileRow): User {
  return {
    id: row.id as UserId,
    displayName: row.display_name ?? undefined,
    email: row.email ?? undefined,
    age: row.age ?? undefined,
    preferredWeightUnit: row.preferred_weight_unit as WeightUnit,
    trainingExperience: (row.training_experience as ProgrammeDifficulty | null) ?? undefined,
    goals: (row.goals as ProgrammeGoal[] | null) ?? undefined,
    preferredTrainingDaysPerWeek: row.preferred_training_days_per_week ?? undefined,
    availableEquipment: (row.available_equipment as Equipment[] | null) ?? undefined,
    activeProgramId: (row.active_program_id as ProgramId | null) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The signed-in user's profile row. Always exists by the time this is
 * called — a `profiles` row is created automatically the moment a Supabase
 * Auth user is created (see the `profiles` migration's trigger), and
 * `ensureSession()` in lib/supabase/auth.ts has already run before any
 * screen under SessionGate mounts.
 */
export async function getProfile(): Promise<User> {
  const userId = getCurrentUserIdSync();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return profileRowToDomain(data);
}

export async function updateProfile(updates: {
  displayName?: string;
  age?: number;
  trainingExperience?: ProgrammeDifficulty;
  goals?: ProgrammeGoal[];
  preferredTrainingDaysPerWeek?: number;
  availableEquipment?: Equipment[];
  preferredWeightUnit?: WeightUnit;
}): Promise<User> {
  const userId = getCurrentUserIdSync();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.displayName !== undefined) patch.display_name = updates.displayName;
  if (updates.age !== undefined) patch.age = updates.age;
  if (updates.trainingExperience !== undefined) patch.training_experience = updates.trainingExperience;
  if (updates.goals !== undefined) patch.goals = updates.goals;
  if (updates.preferredTrainingDaysPerWeek !== undefined) {
    patch.preferred_training_days_per_week = updates.preferredTrainingDaysPerWeek;
  }
  if (updates.availableEquipment !== undefined) patch.available_equipment = updates.availableEquipment;
  if (updates.preferredWeightUnit !== undefined) patch.preferred_weight_unit = updates.preferredWeightUnit;

  const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select().single();
  if (error) throw error;
  return profileRowToDomain(data);
}

/**
 * Which programme the user is actively following — stored on their profile
 * (not AsyncStorage) so it's real application state backed by the database,
 * consistent across devices, rather than living only on one client.
 */
export async function setActiveProgramId(programId: ProgramId): Promise<void> {
  const userId = getCurrentUserIdSync();
  const { error } = await supabase
    .from("profiles")
    .update({ active_program_id: programId, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}
