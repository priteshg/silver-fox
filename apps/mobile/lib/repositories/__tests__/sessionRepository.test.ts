import type { WorkoutSession } from "@silver-fox/domain";
import type { UserId, WorkoutId } from "@silver-fox/types";
import { beforeEach, describe, expect, it } from "vitest";
import { resetMockAsyncStorage } from "../../../test/mockAsyncStorage";
import { clearActiveSession, loadActiveSession, saveActiveSession } from "../sessionRepository";

function session(): WorkoutSession {
  return {
    id: "session_1" as WorkoutId,
    userId: "user_1" as UserId,
    dayName: "Push",
    startedAt: "2026-01-01T00:00:00.000Z",
    exercises: [],
  };
}

describe("sessionRepository", () => {
  beforeEach(() => {
    resetMockAsyncStorage();
  });

  it("has no active session by default", async () => {
    expect(await loadActiveSession()).toBeNull();
  });

  it("round-trips a saved session — resuming an interrupted workout", async () => {
    await saveActiveSession(session());
    const restored = await loadActiveSession();
    expect(restored?.dayName).toBe("Push");
  });

  it("clears the active session", async () => {
    await saveActiveSession(session());
    await clearActiveSession();
    expect(await loadActiveSession()).toBeNull();
  });

  it("drops a malformed stored value instead of throwing", async () => {
    await saveActiveSession({ garbage: true } as unknown as WorkoutSession);
    expect(await loadActiveSession()).toBeNull();
  });
});
