import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  restoreExistingSession,
  signInWithEmail,
  signOut as signOutOfSupabase,
  signUpWithEmail,
  type SignUpResult,
} from "../lib/supabase/auth";
import { supabase } from "../lib/supabase/client";
import { cloneBuiltInProgram, setSelectedProgramId } from "../lib/repositories/programRepository";
import { getPendingDemoProgramChoice, setPendingDemoProgramChoice } from "../lib/repositories/userRepository";
import { SEED_PROGRAM_ID } from "../data/programmeCatalogue";

/**
 * Two separate, deliberately independent layers — see AUTH_AND_STATE_MODEL.md
 * and FOUNDATION_DECISIONS.md (Decision 3) for the full reasoning:
 *
 * - Supabase Authentication State: only ever "no session" or "authenticated",
 *   derived from Supabase itself (`getSession`/`onAuthStateChange`). Nothing
 *   about Demo exists at this layer — RLS and `auth.uid()` have no concept
 *   of it, and this code never gives them one.
 * - Client View Mode: a purely local presentation choice. "demo" only ever
 *   exists here, is reachable only while the Supabase layer has no session,
 *   and never results in any Supabase call.
 */
export type ClientViewMode = "logged_out" | "demo" | "app";

interface AuthContextValue {
  /** "loading" while the initial session check is in flight, "error" if it failed outright (not just "no session" — that's a normal, successful "no session" result). */
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  viewMode: ClientViewMode;
  /** Demo is purely local — see the type doc above. Never touches Supabase. */
  enterDemo: () => void;
  exitDemo: () => void;
  /**
   * `fromDemo` marks a signup that should be followed by the "Use this
   * programme" / "Start fresh" choice (CORE_IMPLEMENTATION_PLAN.md Stage 4)
   * rather than dropping straight into the app — see `pendingProgramChoice`.
   * Persisted on the account itself (`profiles.pending_demo_program_choice`),
   * not just in-memory, so the choice still surfaces even if it takes
   * confirming an email and signing in again, possibly much later, to
   * actually get a session.
   */
  signUp: (email: string, password: string, fromDemo?: boolean) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
  /**
   * True whenever the signed-in account still owes the "Use this programme"
   * / "Start fresh" choice — checked from the persisted flag every time a
   * session appears (signUp, signIn, or session restoration on a cold
   * start), not just right after a demo-originated signup.
   */
  pendingProgramChoice: boolean;
  resolveProgramChoice: (choice: "use_programme" | "start_fresh") => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  // Only meaningful while Supabase has no session; ignored once authenticated.
  const [preAuthView, setPreAuthView] = useState<"logged_out" | "demo">("logged_out");
  const [hasSession, setHasSession] = useState(false);
  const [pendingProgramChoice, setPendingProgramChoice] = useState(false);

  const checkExistingSession = useCallback(() => {
    setStatus("loading");
    setErrorMessage(undefined);
    restoreExistingSession()
      .then(async (userId) => {
        // Covers the cold-start / reopen case: a demo-originated signup
        // that only completed its email confirmation after the app was
        // last closed still needs this checked here, not just at the
        // original signUp()/signIn() call sites — this is often how that
        // choice is actually first detected. Resolved before either
        // setState call, not after setHasSession alone, so both update in
        // the same render — otherwise the real app would flash on screen
        // for a beat before the choice prompt replaced it.
        const pending = userId !== null ? await getPendingDemoProgramChoice() : false;
        setHasSession(userId !== null);
        setPendingProgramChoice(pending);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        console.error("Failed to check for an existing session", error);
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  // Reacts to sign-out and to Supabase's own session lifecycle (e.g. a
  // refresh failure expiring the session) independently of any explicit
  // action this app took — a session that disappears out from under us
  // must return the person to Logged Out, never leave stale authenticated
  // UI up, and never land them in Demo.
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(session !== null);
      if (!session) setPreAuthView("logged_out");
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const enterDemo = useCallback(() => setPreAuthView("demo"), []);
  const exitDemo = useCallback(() => setPreAuthView("logged_out"), []);

  const signUp = useCallback(async (email: string, password: string, fromDemo?: boolean): Promise<SignUpResult> => {
    // `fromDemo` only ever controls what gets written onto the account here
    // (via signUpWithEmail's user metadata, read by the `profiles` trigger —
    // see supabase/migrations and lib/supabase/auth.ts). Whether to actually
    // show the choice is decided uniformly below, from that same persisted
    // flag, the same way signIn() and session restoration decide it — so a
    // signup that gets a session immediately and one that only gets it much
    // later (after confirming and signing in separately) end up showing the
    // prompt through the exact same path, not two different mechanisms that
    // could drift apart.
    const result = await signUpWithEmail(email, password, fromDemo);
    if (result.status === "signed_in") {
      // Resolved before setHasSession — see checkExistingSession's own
      // comment for why the ordering avoids a real app flash.
      const pending = await getPendingDemoProgramChoice();
      setHasSession(true);
      setPendingProgramChoice(pending);
    }
    return result;
  }, []);

  const resolveProgramChoice = useCallback(async (choice: "use_programme" | "start_fresh") => {
    if (choice === "use_programme") {
      const cloned = await cloneBuiltInProgram(SEED_PROGRAM_ID);
      await setSelectedProgramId(cloned.program.id);
    }
    // Persisted, not just local: without this, signing out and back in (or
    // simply reopening the app) before the DB were updated would show the
    // prompt again even though it was already resolved.
    await setPendingDemoProgramChoice(false);
    setPendingProgramChoice(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmail(email, password);
    const pending = await getPendingDemoProgramChoice();
    setHasSession(true);
    setPendingProgramChoice(pending);
  }, []);

  const signOut = useCallback(async () => {
    await signOutOfSupabase();
    setHasSession(false);
    setPreAuthView("logged_out");
    setPendingProgramChoice(false);
  }, []);

  const viewMode: ClientViewMode = hasSession ? "app" : preAuthView;

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      errorMessage,
      viewMode,
      enterDemo,
      exitDemo,
      signUp,
      signIn,
      signOut,
      retry: checkExistingSession,
      pendingProgramChoice,
      resolveProgramChoice,
    }),
    [
      status,
      errorMessage,
      viewMode,
      enterDemo,
      exitDemo,
      signUp,
      signIn,
      signOut,
      checkExistingSession,
      pendingProgramChoice,
      resolveProgramChoice,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth() must be called inside an AuthProvider.");
  return context;
}
