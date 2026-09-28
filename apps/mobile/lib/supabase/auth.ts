import type { UserId } from "@silver-fox/types";
import * as Linking from "expo-linking";
import { isSupabaseConfigured, supabase } from "./client";

let sessionReady: Promise<UserId> | null = null;
let currentUserId: UserId | null = null;

/**
 * Every device gets a real Supabase Auth identity — via anonymous sign-in,
 * since there's no login screen yet — so Row Level Security has a genuine
 * `auth.uid()` to scope workouts, custom programmes, and custom exercises
 * to. A `profiles` row is created automatically (see the `profiles`
 * migration's trigger) the first time this runs on a device; every run
 * after that just restores the persisted session from AsyncStorage.
 *
 * This is the direct replacement for the old hardcoded `LOCAL_USER_ID`
 * constant. Upgrading an anonymous session to a real email/password or
 * social account later (`supabase.auth.linkIdentity`) keeps the same user
 * id and all of its data — no migration needed when real auth arrives.
 */
export function ensureSession(): Promise<UserId> {
  if (!sessionReady) {
    // Cache the in-flight attempt so concurrent callers share it, but never
    // cache a *failure* — otherwise SessionGate's "Try Again" would just
    // replay the same rejected promise forever instead of actually retrying.
    sessionReady = loadOrCreateSession().catch((error: unknown) => {
      sessionReady = null;
      throw error;
    });
  }
  return sessionReady;
}

async function loadOrCreateSession(): Promise<UserId> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase isn't configured. Copy apps/mobile/.env.example to .env, fill in your project's URL " +
        "and anon key (Project Settings → API), and restart the dev server.",
    );
  }

  const { data: existing, error: getSessionError } = await supabase.auth.getSession();
  if (getSessionError) throw getSessionError;
  if (existing.session) {
    currentUserId = existing.session.user.id as UserId;
    return currentUserId;
  }

  const { data: created, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw signInError;
  if (!created.session) throw new Error("Anonymous sign-in did not return a session.");
  currentUserId = created.session.user.id as UserId;
  return currentUserId;
}

/** Throws if called before `ensureSession()` has resolved once at app start. */
export async function getCurrentUserId(): Promise<UserId> {
  return ensureSession();
}

/**
 * Checks for an already-persisted session — real or a legacy anonymous one
 * from before real authentication existed — without ever creating a new
 * one. Used at app launch in place of `ensureSession()`, which would
 * silently call `signInAnonymously()` if no session existed. A device that
 * already has a session (of either kind) keeps working exactly as before;
 * a device with none is left alone rather than being auto-enrolled.
 */
export async function restoreExistingSession(): Promise<UserId | null> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase isn't configured. Copy apps/mobile/.env.example to .env, fill in your project's URL " +
        "and anon key (Project Settings → API), and restart the dev server.",
    );
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) return null;
  currentUserId = data.session.user.id as UserId;
  sessionReady = Promise.resolve(currentUserId);
  return currentUserId;
}

/**
 * A successful sign-up with email confirmation required is NOT an error —
 * it's a distinct, valid outcome (the account was created; it just isn't
 * signed in yet). Callers must handle both cases explicitly rather than
 * collapsing "confirmation required" into a thrown error, which would make
 * it indistinguishable from actual failures (invalid details, a duplicate
 * email, a network problem) in the UI.
 */
export type SignUpResult = { status: "signed_in"; userId: UserId } | { status: "confirmation_required" };

/** Creates a real, credentialed account. Distinct from `signInAnonymously` — this is the only way `packages/domain`'s "Authenticated" state should be reached going forward. */
export async function signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) {
    // Confirmed account creation with email confirmation required (this
    // project's Supabase Auth setting, kept enabled — see
    // AUTH_AND_STATE_MODEL.md). Not thrown: the account creation itself
    // succeeded.
    return { status: "confirmation_required" };
  }
  currentUserId = data.session.user.id as UserId;
  sessionReady = Promise.resolve(currentUserId);
  return { status: "signed_in", userId: currentUserId };
}

export async function signInWithEmail(email: string, password: string): Promise<UserId> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("Sign-in did not return a session.");
  currentUserId = data.session.user.id as UserId;
  sessionReady = Promise.resolve(currentUserId);
  return currentUserId;
}

/**
 * Sends a password-reset email, if the address belongs to an account.
 * Deliberately never checked or branched on here: `resetPasswordForEmail`
 * itself returns the same success response whether or not the address is
 * registered (Supabase's own anti-enumeration behaviour), and this function
 * must not add a check that would leak the difference — e.g. querying
 * `profiles` first to decide what to show. Callers should show one fixed
 * "check your email" message regardless of the outcome.
 *
 * `Linking.createURL` (not a hardcoded string) builds the right redirect for
 * wherever this is actually running — `exp://…` in Expo Go during
 * development, `primeform://…` in a standalone build — so the link Supabase
 * emails back always matches how this app was actually opened.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL("reset-password"),
  });
  if (error) throw error;
}

/**
 * Exchanges the one-time `code` from a password-reset deep link for a real
 * (temporary) Supabase session, scoped to exactly one thing: calling
 * `updatePassword` below. This throws for an invalid, expired, or
 * already-used code — Supabase enforces all of that server-side, not this
 * app, so there's nothing else to validate here.
 */
export async function exchangeRecoveryCode(code: string): Promise<void> {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  if (!data.session) throw new Error("The reset link did not return a session.");
  currentUserId = data.session.user.id as UserId;
  sessionReady = Promise.resolve(currentUserId);
}

/**
 * Sets a new password on the session established by `exchangeRecoveryCode`.
 * This is the only supported way to change a password in this app — there
 * is no separate password field or hash stored anywhere outside Supabase
 * Auth for this app to manage itself.
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentUserId = null;
  sessionReady = null;
}

/**
 * Synchronous access to the already-established session's user id. Safe to
 * call from anywhere rendered inside `SessionGate` (app/_layout.tsx), which
 * guarantees `ensureSession()` has already resolved before any screen mounts.
 */
export function getCurrentUserIdSync(): UserId {
  if (!currentUserId) {
    throw new Error("getCurrentUserIdSync() called before the Supabase session was established.");
  }
  return currentUserId;
}
