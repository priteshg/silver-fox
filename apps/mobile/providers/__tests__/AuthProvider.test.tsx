import type { Exercise, Program, ProgramExercise, WorkoutDay } from "@silver-fox/domain";
import type { ExerciseId, ProgramExerciseId, UserId, WorkoutDayId } from "@silver-fox/types";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_PROGRAM_ID } from "../../data/programmeCatalogue";
import { exerciseToRow } from "../../lib/repositories/exerciseMappers";
import { dayToRow, programExerciseToRow, programToRow } from "../../lib/repositories/programRepository";
import { restoreExistingSession, signInWithEmail, signUpWithEmail } from "../../lib/supabase/auth";
import { resetFakeDb, type FakeRow } from "../../test/fakeSupabase";
import { fakeSupabaseDb, TEST_USER_ID } from "../../vitest.setup";
import { AuthProvider, useAuth } from "../AuthProvider";

const now = "2026-01-01T00:00:00.000Z";
const testUserId = TEST_USER_ID as UserId;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

async function renderReady() {
  const rendered = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(rendered.result.current.status).toBe("ready"));
  return rendered;
}

/** Mirrors the bare row `handle_new_auth_user` creates on real sign-up — every profile starts out this bare. */
function seedProfile(overrides: FakeRow = {}) {
  fakeSupabaseDb.profiles = [
    {
      id: TEST_USER_ID,
      display_name: null,
      email: null,
      age: null,
      preferred_weight_unit: "kg",
      training_experience: null,
      goals: null,
      preferred_training_days_per_week: null,
      available_equipment: null,
      active_program_id: null,
      pending_demo_program_choice: false,
      created_at: now,
      updated_at: now,
      ...overrides,
    },
  ];
}

/** The flagship built-in programme resolveProgramChoice("use_programme") clones — mirrors cloneBuiltInProgram.test.ts's own seed. */
function seedBuiltInProgram() {
  const dayId = "day_builtin" as WorkoutDayId;
  const exerciseId = "ex_builtin" as ExerciseId;
  const program: Program = { id: SEED_PROGRAM_ID, name: "Foundation 40+", description: "The flagship programme.", isCustom: false, createdAt: now, updatedAt: now };
  const day: WorkoutDay = { id: dayId, programId: SEED_PROGRAM_ID, name: "Push", order: 0, focus: "push", createdAt: now, updatedAt: now };
  const exercise: Exercise = {
    id: exerciseId,
    name: "Bench Press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: [],
    equipment: "barbell",
    laterality: "bilateral",
    description: "",
    instructions: [],
    formCues: [],
    commonMistakes: [],
    isCustom: false,
    createdAt: now,
    updatedAt: now,
  };
  const programExercise: ProgramExercise = {
    id: "pe_builtin" as ProgramExerciseId,
    workoutDayId: dayId,
    exerciseId,
    order: 0,
    targetSets: 3,
    targetRepRangeLow: 6,
    targetRepRangeHigh: 10,
    targetRir: 2,
    restSeconds: 150,
    createdAt: now,
    updatedAt: now,
  };

  fakeSupabaseDb.programs = [programToRow(program) as unknown as FakeRow];
  fakeSupabaseDb.program_sessions = [dayToRow(day) as unknown as FakeRow];
  fakeSupabaseDb.program_exercises = [programExerciseToRow(programExercise) as unknown as FakeRow];
  fakeSupabaseDb.exercises = [exerciseToRow(exercise) as unknown as FakeRow];
}

describe("AuthProvider — pending demo programme choice", () => {
  beforeEach(() => {
    resetFakeDb(fakeSupabaseDb);
    seedBuiltInProgram();
    seedProfile();
    vi.mocked(signUpWithEmail).mockReset();
    vi.mocked(signInWithEmail).mockReset();
    vi.mocked(restoreExistingSession).mockReset();
    vi.mocked(restoreExistingSession).mockResolvedValue(null);
  });

  it("Demo → Use this programme → signup → email confirmation required → later sign in → pending programme detected → programme choice shown → programme accepted → pending state cleared", async () => {
    vi.mocked(signUpWithEmail).mockResolvedValueOnce({ status: "confirmation_required" });
    const { result } = await renderReady();

    let signUpResult: unknown;
    await act(async () => {
      signUpResult = await result.current.signUp("person@example.com", "password123", true);
    });
    expect(signUpResult).toEqual({ status: "confirmation_required" });
    // No session yet — the choice can't be shown until one exists.
    expect(result.current.pendingProgramChoice).toBe(false);
    expect(result.current.viewMode).not.toBe("app");

    // Stand-in for what handle_new_auth_user() already wrote onto the
    // profile at signup time (the fake DB has no real SQL trigger to run
    // it for us) — the person has since confirmed their email out of band
    // and is now signing in for the first time.
    seedProfile({ pending_demo_program_choice: true });
    vi.mocked(signInWithEmail).mockResolvedValueOnce(testUserId);

    await act(async () => {
      await result.current.signIn("person@example.com", "password123");
    });
    expect(result.current.pendingProgramChoice).toBe(true);

    await act(async () => {
      await result.current.resolveProgramChoice("use_programme");
    });
    expect(result.current.pendingProgramChoice).toBe(false);
    expect(fakeSupabaseDb.profiles[0]?.pending_demo_program_choice).toBe(false);
    expect(fakeSupabaseDb.profiles[0]?.active_program_id).not.toBeNull();
  });

  it("Demo → Use this programme → signup returns a session immediately → programme choice is resolved without a separate later sign-in", async () => {
    // Same stand-in as above: the trigger already set this at signUp()'s
    // insert time, before signUpWithEmail's mocked promise even resolves.
    seedProfile({ pending_demo_program_choice: true });
    vi.mocked(signUpWithEmail).mockResolvedValueOnce({ status: "signed_in", userId: testUserId });
    const { result } = await renderReady();

    await act(async () => {
      await result.current.signUp("person@example.com", "password123", true);
    });
    expect(result.current.pendingProgramChoice).toBe(true);

    await act(async () => {
      await result.current.resolveProgramChoice("start_fresh");
    });
    expect(result.current.pendingProgramChoice).toBe(false);
    expect(fakeSupabaseDb.profiles[0]?.pending_demo_program_choice).toBe(false);
    // "Start fresh" never clones a programme.
    expect(fakeSupabaseDb.profiles[0]?.active_program_id).toBeNull();
  });

  it("an ordinary sign-in, not originating from the demo, never shows the programme-choice prompt", async () => {
    seedProfile({ pending_demo_program_choice: false });
    vi.mocked(signInWithEmail).mockResolvedValueOnce(testUserId);
    const { result } = await renderReady();

    await act(async () => {
      await result.current.signIn("person@example.com", "password123");
    });
    expect(result.current.pendingProgramChoice).toBe(false);
    expect(result.current.viewMode).toBe("app");
  });

  it("a cold start that restores an existing session also detects a pending demo choice, not just signIn()/signUp()", async () => {
    seedProfile({ pending_demo_program_choice: true });
    vi.mocked(restoreExistingSession).mockResolvedValueOnce(testUserId);

    const { result } = await renderReady();
    expect(result.current.pendingProgramChoice).toBe(true);
  });
});
