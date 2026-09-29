import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Only for standing in for the one thing a browser-only E2E run genuinely
 * cannot do: confirming a real signup's email (no inbox to click a link
 * in). Every scenario using this still drives the real Create Account /
 * Sign In screens for everything else — see starting_primeform.steps.ts and
 * demo_experience.steps.ts. Requires the project's service_role key, kept
 * out of .env (see .env.test.local.example's own doc comment for why) and
 * out of this repo entirely (.env.test.local is git-ignored).
 */
function loadServiceRoleKey(): string {
  const envPath = path.join(__dirname, "..", "..", ".env.test.local");
  if (!existsSync(envPath)) {
    throw new Error(
      "apps/mobile/.env.test.local is missing — copy .env.test.local.example to .env.test.local and fill in " +
        "the project's service_role key (Project Settings -> API in the Supabase dashboard). Needed only for " +
        "the @signupgap-turned-real scenarios that mint or confirm test accounts via the Admin API.",
    );
  }
  const text = readFileSync(envPath, "utf8");
  const line = text.split("\n").find((l) => l.trim().startsWith("SUPABASE_SERVICE_ROLE_KEY="));
  if (!line) throw new Error("apps/mobile/.env.test.local is missing a SUPABASE_SERVICE_ROLE_KEY=... line.");
  const key = line.slice(line.indexOf("=") + 1).trim();
  if (!key || key === "your-service-role-key") {
    throw new Error("apps/mobile/.env.test.local's SUPABASE_SERVICE_ROLE_KEY is still the placeholder value.");
  }
  return key;
}

function loadSupabaseUrl(): string {
  const envPath = path.join(__dirname, "..", "..", ".env");
  const text = readFileSync(envPath, "utf8");
  const line = text.split("\n").find((l) => l.trim().startsWith("EXPO_PUBLIC_SUPABASE_URL="));
  if (!line) throw new Error("apps/mobile/.env is missing EXPO_PUBLIC_SUPABASE_URL=...");
  return line.slice(line.indexOf("=") + 1).trim();
}

let adminClient: SupabaseClient | null = null;

/** A service_role-authenticated client — bypasses RLS entirely. Never expose this to a page or reuse it for anything an ordinary user action should go through instead. */
export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(loadSupabaseUrl(), loadServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

/** Shared across every step file that creates a real test account through this module, so there's one password to reason about, not one per file. */
export const TEST_ACCOUNT_PASSWORD = "TestPassword123!";

/**
 * A fresh, real-deliverable email for a scenario that drives the actual
 * Create Account form — Supabase's own signup validation rejects
 * reserved/undeliverable domains outright (confirmed directly:
 * "...@example.com" is refused as invalid before any account is even
 * created), so this needs a domain that genuinely resolves. Uses Gmail's
 * `+tag` sub-addressing on the project maintainer's own address — every
 * variant still lands in the one real inbox, and each of these scenarios
 * immediately confirms the account via the Admin API rather than ever
 * reading that inbox, but the *send* itself is real and counts against
 * this project's shared Supabase email rate limit (no custom SMTP
 * configured), so this is deliberately not called from any step that
 * doesn't need to exercise the real signup form.
 */
export function uniqueTestEmail(label: string): string {
  return `pg4ndhi+e2e_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@gmail.com`;
}

/**
 * Marks an already-created (via the real Create Account form) account's
 * email as confirmed — standing in for the person clicking the link
 * Supabase emailed them. Looked up by email via `profiles` (populated by
 * the `handle_new_auth_user` trigger at signup) rather than needing the
 * user id, since the calling step only ever has the email it just typed.
 */
export async function confirmTestAccountEmail(email: string): Promise<string> {
  const admin = getAdminClient();
  const { data: profile, error: profileError } = await admin.from("profiles").select("id").eq("email", email).single();
  if (profileError) throw profileError;
  const userId = (profile as { id: string }).id;
  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) throw error;
  return userId;
}

/** Directly mints an already-confirmed fixture account — for scenarios whose Given is "I already have an account", not the creation process itself. */
export async function createConfirmedTestAccount(email: string, password: string): Promise<string> {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

/**
 * Deletes the auth.users row for a test-created account by email — cascades
 * to `profiles`, owned `programs`, and everything under those (see
 * supabase/migrations' `on delete cascade` FKs), so this alone is complete
 * cleanup. Silent no-op if the account doesn't exist (already cleaned up,
 * or the scenario never got far enough to create one) — the same
 * "nothing to clean up is a legitimate outcome" reasoning bddFixtures.ts's
 * cleanupSupabaseAsTestUser uses.
 */
export async function deleteTestAccountByEmail(email: string): Promise<void> {
  const admin = getAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) return;
  await admin.auth.admin.deleteUser((profile as { id: string }).id);
}
