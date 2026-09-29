import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prefix for every workout row this suite's BDD scenarios insert directly
 * (bypassing the Alert.alert-gated Finish workout flow — see
 * e2e/journeys/delete-workflows.spec.ts's KNOWN GAP tests for why that flow
 * isn't reachable in a browser-driven E2E run). Every BDD step file that
 * calls seedCompletedWorkout must delete `workouts` rows matching this
 * prefix in its own After() hook.
 */
export const SEEDED_WORKOUT_PREFIX = "e2e_seed_";

/**
 * getUser() was observed both resolving with a null user and REJECTING
 * (AuthSessionMissingError) transiently, immediately after setSession() —
 * neither reproducible on retry (confirmed: reran the two affected
 * workout_history.feature scenarios in isolation and both passed cleanly).
 * The call is wrapped in try/catch so a rejection is retried too, not just
 * a resolved-with-null-user result — a bare rejection previously skipped
 * the retry loop entirely.
 */
async function getUserWithRetry(supabase: SupabaseClient) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (data.user) return data.user;
      lastError = error;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw lastError ?? new Error("supabase.auth.getUser() returned no user after retries.");
}

/**
 * Inserts a completed workout + one set for the named exercise directly via
 * Supabase, so history-driven UI (previous-performance prefill, Progress
 * tab, workout history lists) reflects it without ever going through
 * Finish workout. `order` defaults to 1 to match the in-session `setNumber`
 * convention (1-based — confirmed directly: seeding `order: 0` produces no
 * match against the active session's own sets, though history views that
 * don't do that specific per-set match, like the suggestion banner or the
 * Progress tab, aren't affected by it).
 */
export async function seedCompletedWorkout(
  supabase: SupabaseClient,
  exerciseName: string,
  weightKg: number,
  reps: number,
  options?: { order?: number; daysAgo?: number; programId?: string; workoutDayId?: string },
): Promise<string> {
  const user = await getUserWithRetry(supabase);
  const { data: exercise } = await supabase.from("exercises").select("id").eq("name", exerciseName).single();
  const workoutId = `${SEEDED_WORKOUT_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date(Date.now() - (options?.daysAgo ?? 1) * 24 * 60 * 60 * 1000).toISOString();
  const { error: workoutError } = await supabase.from("workouts").insert({
    id: workoutId,
    user_id: user.id,
    program_id: options?.programId ?? null,
    session_id: options?.workoutDayId ?? null,
    started_at: timestamp,
    completed_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (workoutError) throw workoutError;
  const { error: setError } = await supabase.from("workout_sets").insert({
    id: `${workoutId}_set0`,
    workout_id: workoutId,
    exercise_id: exercise!.id,
    order: options?.order ?? 1,
    weight: weightKg,
    weight_unit: "kg",
    reps,
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (setError) throw setError;
  return workoutId;
}

/** Foundation 40+'s program id and a named training day's id, for tagging a seeded workout so it displays under that day's real name (workoutRepository/useWorkoutHome falls back to "Workout" when session_id is unset). */
export async function resolveBuiltInProgramDay(
  supabase: SupabaseClient,
  programName: string,
  dayName: string,
): Promise<{ programId: string; workoutDayId: string }> {
  const { data: program } = await supabase.from("programs").select("id").eq("name", programName).is("owner_id", null).single();
  const { data: day } = await supabase
    .from("program_sessions")
    .select("id")
    .eq("program_id", program!.id)
    .eq("name", dayName)
    .single();
  return { programId: program!.id, workoutDayId: day!.id };
}
