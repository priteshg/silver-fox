import type { ExerciseId, UserId } from "@silver-fox/types";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { listWorkouts, listWorkoutSets } from "../../lib/repositories/workoutRepository";
import { loadActiveSession } from "../../lib/repositories/sessionRepository";
import { resetFakeDb } from "../../test/fakeSupabase";
import { resetMockAsyncStorage } from "../../test/mockAsyncStorage";
import { fakeSupabaseDb } from "../../vitest.setup";
import { ActiveSessionProvider, useActiveSession } from "../ActiveSessionProvider";

const userId = "user_1" as UserId;
const exerciseId = "exercise_1" as ExerciseId;

function wrapper({ children }: { children: ReactNode }) {
  return <ActiveSessionProvider>{children}</ActiveSessionProvider>;
}

async function renderReady() {
  const rendered = renderHook(() => useActiveSession(), { wrapper });
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  return rendered;
}

describe("ActiveSessionProvider", () => {
  beforeEach(() => {
    resetMockAsyncStorage();
    resetFakeDb(fakeSupabaseDb);
  });

  it("has no active session when storage is empty", async () => {
    const { result } = await renderReady();
    expect(result.current.session).toBeNull();
  });

  it("starting a workout creates and persists a session", async () => {
    const { result } = await renderReady();

    act(() => {
      result.current.startSession({
        userId,
        dayName: "Push",
        exercises: [
          { exerciseId, order: 0, targetSets: 2, targetRepRangeLow: 8, targetRepRangeHigh: 12 },
        ],
      });
    });

    expect(result.current.session?.dayName).toBe("Push");
    expect(result.current.session?.exercises[0]?.sets).toHaveLength(2);
    await waitFor(async () => expect((await loadActiveSession())?.dayName).toBe("Push"));
  });

  it("completing a set updates state and persists immediately", async () => {
    const { result } = await renderReady();
    act(() => {
      result.current.startSession({
        userId,
        dayName: "Push",
        exercises: [
          { exerciseId, order: 0, targetSets: 1, targetRepRangeLow: 8, targetRepRangeHigh: 12 },
        ],
      });
    });
    const sessionExerciseId = result.current.session!.exercises[0]!.id;
    const setId = result.current.session!.exercises[0]!.sets[0]!.id;

    act(() => {
      result.current.completeSet(sessionExerciseId, setId, { weight: 60, reps: 10, rir: 2 });
    });

    const set = result.current.session?.exercises[0]?.sets[0];
    expect(set?.completed).toBe(true);
    expect(set?.weight).toBe(60);

    await waitFor(async () => {
      const persisted = await loadActiveSession();
      expect(persisted?.exercises[0]?.sets[0]?.completed).toBe(true);
    });
  });

  it("resumes a session left behind by a previous run (interrupted workout)", async () => {
    const { result: first } = await renderReady();
    act(() => {
      first.current.startSession({
        userId,
        dayName: "Pull",
        exercises: [
          { exerciseId, order: 0, targetSets: 1, targetRepRangeLow: 8, targetRepRangeHigh: 12 },
        ],
      });
    });

    // A fresh provider instance stands in for the app restarting.
    const { result: second } = await renderReady();
    expect(second.current.session?.dayName).toBe("Pull");
  });

  it("finishing a workout saves only completed sets and clears the session", async () => {
    const { result } = await renderReady();
    act(() => {
      result.current.startSession({
        userId,
        dayName: "Push",
        exercises: [
          { exerciseId, order: 0, targetSets: 2, targetRepRangeLow: 8, targetRepRangeHigh: 12 },
        ],
      });
    });
    const sessionExerciseId = result.current.session!.exercises[0]!.id;
    const setId = result.current.session!.exercises[0]!.sets[0]!.id;
    act(() => {
      result.current.completeSet(sessionExerciseId, setId, { weight: 60, reps: 10 });
    });

    await act(async () => {
      await result.current.finishSession("kg");
    });

    expect(result.current.session).toBeNull();
    expect(await loadActiveSession()).toBeNull();

    const workouts = await listWorkouts();
    const sets = await listWorkoutSets();
    expect(workouts).toHaveLength(1);
    expect(workouts[0]?.completedAt).toBeDefined();
    expect(sets).toHaveLength(1);
  });

  it("discarding a workout clears the session without saving history", async () => {
    const { result } = await renderReady();
    act(() => {
      result.current.startSession({
        userId,
        dayName: "Push",
        exercises: [
          { exerciseId, order: 0, targetSets: 1, targetRepRangeLow: 8, targetRepRangeHigh: 12 },
        ],
      });
    });

    act(() => {
      result.current.discardSession();
    });

    expect(result.current.session).toBeNull();
    expect(await listWorkouts()).toHaveLength(0);
    expect(await loadActiveSession()).toBeNull();
  });
});
