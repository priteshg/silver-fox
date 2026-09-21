/**
 * Tests for suggestNextLoad and summarizeExerciseHistory / getPreviousPerformance.
 *
 * NOTE: The project runs Vitest, not Jest. The describe/it/expect API is
 * identical for these cases, so the file is compatible with both runners,
 * but `pnpm test` inside packages/domain invokes Vitest.
 *
 * KNOWN GAP: The load suggestion is ephemeral — computed live in the active
 * workout screen and never written back to the programme or stored for the next
 * session. Tests here validate the pure-function behaviour only. There is
 * intentionally no test for "after finishing a session the programme's target
 * weight updates" because that mechanism does not exist yet.
 */

import { describe, expect, it } from "vitest";
import { suggestNextLoad } from "../../src/logic/loadProgression";
import {
  getPreviousPerformance,
  summarizeExerciseHistory,
} from "../../src/logic/progression";
import type { Workout } from "../../src/entities/workout";
import type { WorkoutSet } from "../../src/entities/workoutSet";
import type {
  ExerciseId,
  UserId,
  WorkoutId,
  WorkoutSetId,
} from "@silver-fox/types";

// ─── Shared fixture helpers ───────────────────────────────────────────────────

const USER_ID = "user_1" as UserId;
const EXERCISE_ID = "exercise_1" as ExerciseId;
const OTHER_EXERCISE_ID = "exercise_2" as ExerciseId;

let _setSeq = 0;
function makeSet(
  workoutId: string,
  weight: number,
  reps: number,
  opts: { rir?: number; order?: number; exerciseId?: ExerciseId } = {},
): WorkoutSet {
  _setSeq++;
  return {
    id: `set_${_setSeq}` as WorkoutSetId,
    workoutId: workoutId as WorkoutId,
    exerciseId: opts.exerciseId ?? EXERCISE_ID,
    order: opts.order ?? _setSeq,
    weight,
    weightUnit: "kg",
    reps,
    rir: opts.rir,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeWorkout(
  id: string,
  startedAt: string,
  completedAt?: string,
): Workout {
  return {
    id: id as WorkoutId,
    userId: USER_ID,
    startedAt,
    completedAt,
    createdAt: startedAt,
    updatedAt: completedAt ?? startedAt,
  };
}

// ─── suggestNextLoad ──────────────────────────────────────────────────────────

describe("suggestNextLoad", () => {
  // Standard case: reps hit the ceiling, RIR on target → earn the weight jump
  describe("standard progression (RIR 2–3, reps at ceiling)", () => {
    it("returns increase when every set hits the top of the range at target RIR", () => {
      const result = suggestNextLoad({
        previousSets: [
          { weight: 60, reps: 12, rir: 2 },
          { weight: 60, reps: 12, rir: 3 },
          { weight: 60, reps: 12, rir: 2 },
        ],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
        incrementKg: 2.5,
      });

      expect(result.action).toBe("increase");
      expect(result.suggestedWeight).toBe(62.5);
    });

    it("does not increase when reps are in range but none of them reach the ceiling", () => {
      const result = suggestNextLoad({
        previousSets: [
          { weight: 60, reps: 10, rir: 2 },
          { weight: 60, reps: 10, rir: 2 },
          { weight: 60, reps: 9, rir: 2 },
        ],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
      });

      expect(result.action).toBe("maintain");
      expect(result.suggestedWeight).toBe(60);
    });
  });

  // Near-failure: RIR 0–1 means the lifter was close to failure at current weight.
  // If reps still hit the ceiling, the RIR check blocks the jump — hold the weight.
  // If reps also fell short, that's a clear overload — back off.
  describe("near-failure sets (RIR 0–1)", () => {
    it("maintains load when reps hit the ceiling but RIR fell below target", () => {
      const result = suggestNextLoad({
        previousSets: [
          { weight: 60, reps: 12, rir: 1 },
          { weight: 60, reps: 12, rir: 0 },
          { weight: 60, reps: 12, rir: 1 },
        ],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
      });

      // All sets reached the top of the range, but working harder than prescribed
      // — the function correctly holds rather than jumping weight.
      expect(result.action).toBe("maintain");
      expect(result.suggestedWeight).toBe(60);
    });

    it("decreases load when a set fell short of the rep range at RIR 0", () => {
      const result = suggestNextLoad({
        previousSets: [
          { weight: 80, reps: 8, rir: 2 },
          { weight: 80, reps: 6, rir: 0 }, // below low end of range
        ],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
        incrementKg: 2.5,
      });

      expect(result.action).toBe("decrease");
      expect(result.suggestedWeight).toBe(77.5);
    });

    it("also decreases when RIR is undefined on a failing set (RIR not recorded)", () => {
      // rir being absent is treated as meeting the RIR constraint, so the
      // decrease is driven purely by reps falling below the range floor.
      const result = suggestNextLoad({
        previousSets: [
          { weight: 80, reps: 12, rir: undefined },
          { weight: 80, reps: 5 }, // below low end — no rir field at all
        ],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
        incrementKg: 2.5,
      });

      expect(result.action).toBe("decrease");
    });
  });

  // RIR 4+: the lifter had plenty in the tank. The function still awards the
  // standard increment — it does NOT produce a larger jump or a "flag for review".
  //
  // KNOWN GAP: There is no "this was too easy, consider a bigger jump" signal.
  // The function treats RIR 4 identically to RIR 2 as long as both are ≥ targetRir.
  // A coach reviewing these results manually would likely suggest more than +2.5 kg.
  describe("well-below-target RIR (RIR 4+, exercise felt very easy)", () => {
    it("returns increase with the standard increment — no larger jump is produced", () => {
      const result = suggestNextLoad({
        previousSets: [
          { weight: 60, reps: 12, rir: 4 },
          { weight: 60, reps: 12, rir: 5 },
          { weight: 60, reps: 12, rir: 4 },
        ],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
        incrementKg: 2.5,
      });

      expect(result.action).toBe("increase");
      // Same suggested weight as the RIR-2 standard case — no distinction for "too easy"
      expect(result.suggestedWeight).toBe(62.5);
    });

    it("returns the same suggestion regardless of whether RIR was 2 or 6 (no differentiation)", () => {
      const atTargetRir = suggestNextLoad({
        previousSets: [{ weight: 60, reps: 12, rir: 2 }],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
        incrementKg: 2.5,
      });
      const wellAboveTargetRir = suggestNextLoad({
        previousSets: [{ weight: 60, reps: 12, rir: 6 }],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
        incrementKg: 2.5,
      });

      expect(atTargetRir.suggestedWeight).toBe(wellAboveTargetRir.suggestedWeight);
      expect(atTargetRir.action).toBe(wellAboveTargetRir.action);
    });
  });

  // Missed reps on the final set: if even one set falls short of the rep range
  // floor the function decreases; if reps stay within the range but short of
  // the ceiling, it holds.
  describe("missed reps on last set", () => {
    it("maintains when last set drops within range but below ceiling (not all sets at top)", () => {
      const result = suggestNextLoad({
        previousSets: [
          { weight: 60, reps: 12, rir: 2 },
          { weight: 60, reps: 12, rir: 2 },
          { weight: 60, reps: 10, rir: 2 }, // still in 8-12 range, just not 12
        ],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
      });

      // Last set missed the ceiling — must not increase.
      expect(result.action).toBe("maintain");
      expect(result.suggestedWeight).toBe(60);
    });

    it("decreases when last set falls below the rep range floor", () => {
      const result = suggestNextLoad({
        previousSets: [
          { weight: 60, reps: 12, rir: 2 },
          { weight: 60, reps: 12, rir: 2 },
          { weight: 60, reps: 7, rir: 1 }, // 7 < 8 — below the floor
        ],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
        incrementKg: 2.5,
      });

      expect(result.action).toBe("decrease");
      expect(result.suggestedWeight).toBe(57.5);
    });

    it("does not increase even when only the final set missed (all-or-nothing ceiling rule)", () => {
      // Three sets: first two perfect, last one short. The function requires
      // every set to reach the ceiling, so a single miss blocks the jump.
      const result = suggestNextLoad({
        previousSets: [
          { weight: 100, reps: 5, rir: 3 },
          { weight: 100, reps: 5, rir: 3 },
          { weight: 100, reps: 4, rir: 2 }, // one rep short of ceiling
        ],
        targetRepRangeLow: 3,
        targetRepRangeHigh: 5,
        targetRir: 2,
      });

      expect(result.action).not.toBe("increase");
    });
  });

  // Empty history: first time doing this exercise — must not crash and must
  // return a sensible "no data" default rather than suggesting a weight.
  describe("empty history (first session)", () => {
    it("returns maintain with null suggestedWeight — does not crash", () => {
      const result = suggestNextLoad({
        previousSets: [],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        targetRir: 2,
      });

      expect(result.action).toBe("maintain");
      expect(result.suggestedWeight).toBeNull();
    });

    it("includes a human-readable reason when there is no prior data", () => {
      const result = suggestNextLoad({
        previousSets: [],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
      });

      expect(typeof result.reason).toBe("string");
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });

  // Edge: weight should never go negative regardless of how many decrements
  // are applied from a starting weight close to zero.
  describe("edge: suggested weight never goes negative", () => {
    it("clamps to 0 when the decrement would produce a negative number", () => {
      const result = suggestNextLoad({
        previousSets: [{ weight: 1, reps: 2, rir: 0 }],
        targetRepRangeLow: 8,
        targetRepRangeHigh: 12,
        incrementKg: 2.5,
      });

      expect(result.suggestedWeight).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── summarizeExerciseHistory + getPreviousPerformance ────────────────────────

describe("summarizeExerciseHistory", () => {
  it("returns sessions newest-first", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      makeWorkout("w2", "2026-01-08T00:00:00.000Z", "2026-01-08T01:00:00.000Z"),
      makeWorkout("w3", "2026-01-15T00:00:00.000Z", "2026-01-15T01:00:00.000Z"),
    ];
    const sets = [
      makeSet("w1", 60, 10, { rir: 2, order: 1 }),
      makeSet("w2", 62.5, 10, { rir: 2, order: 1 }),
      makeSet("w3", 65, 10, { rir: 2, order: 1 }),
    ];

    const history = summarizeExerciseHistory(workouts, sets, EXERCISE_ID);

    expect(history).toHaveLength(3);
    expect(history[0]?.workoutId).toBe("w3");
    expect(history[1]?.workoutId).toBe("w2");
    expect(history[2]?.workoutId).toBe("w1");
  });

  it("calculates totalVolume as weight × reps summed across sets in a session", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
    ];
    const sets = [
      makeSet("w1", 60, 10, { order: 1 }), // 600
      makeSet("w1", 60, 10, { order: 2 }), // 600
      makeSet("w1", 60, 8, { order: 3 }), // 480
    ];

    const [summary] = summarizeExerciseHistory(workouts, sets, EXERCISE_ID);

    expect(summary?.totalVolume).toBe(1680);
  });

  it("picks topWeight and topWeightReps from the heaviest set, not the first", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
    ];
    const sets = [
      makeSet("w1", 60, 10, { order: 1 }),
      makeSet("w1", 80, 5, { order: 2 }), // heaviest
      makeSet("w1", 70, 8, { order: 3 }),
    ];

    const [summary] = summarizeExerciseHistory(workouts, sets, EXERCISE_ID);

    expect(summary?.topWeight).toBe(80);
    expect(summary?.topWeightReps).toBe(5);
  });

  it("returns estimatedOneRepMax of 0 for an unweighted set (weight === 0)", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
    ];
    const sets = [makeSet("w1", 0, 15, { order: 1 })];

    const [summary] = summarizeExerciseHistory(workouts, sets, EXERCISE_ID);

    expect(summary?.estimatedOneRepMax).toBe(0);
  });

  it("returns an empty array when no sets match the exercise", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
    ];
    const sets = [makeSet("w1", 60, 10, { order: 1, exerciseId: OTHER_EXERCISE_ID })];

    const history = summarizeExerciseHistory(workouts, sets, EXERCISE_ID);

    expect(history).toHaveLength(0);
  });

  it("ignores workouts that have no sets for the target exercise", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      makeWorkout("w2", "2026-01-08T00:00:00.000Z", "2026-01-08T01:00:00.000Z"),
    ];
    // w2 has only a different exercise
    const sets = [
      makeSet("w1", 60, 10, { order: 1 }),
      makeSet("w2", 80, 5, { order: 1, exerciseId: OTHER_EXERCISE_ID }),
    ];

    const history = summarizeExerciseHistory(workouts, sets, EXERCISE_ID);

    expect(history).toHaveLength(1);
    expect(history[0]?.workoutId).toBe("w1");
  });
});

describe("getPreviousPerformance", () => {
  it("returns null when there is no history at all", () => {
    expect(getPreviousPerformance([], [], EXERCISE_ID)).toBeNull();
  });

  it("returns null when workouts exist but none have sets for this exercise", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
    ];
    expect(getPreviousPerformance(workouts, [], EXERCISE_ID)).toBeNull();
  });

  it("returns the single session when there is only one", () => {
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
    ];
    const sets = [makeSet("w1", 60, 10, { order: 1 })];

    const result = getPreviousPerformance(workouts, sets, EXERCISE_ID);

    expect(result).not.toBeNull();
    expect(result?.workoutId).toBe("w1");
  });

  it("returns the most recent session, not the oldest", () => {
    const workouts = [
      makeWorkout("w_old", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      makeWorkout("w_new", "2026-06-01T00:00:00.000Z", "2026-06-01T01:00:00.000Z"),
    ];
    const sets = [
      makeSet("w_old", 60, 10, { order: 1 }),
      makeSet("w_new", 75, 10, { order: 1 }),
    ];

    const result = getPreviousPerformance(workouts, sets, EXERCISE_ID);

    expect(result?.workoutId).toBe("w_new");
  });
});

// ─── Integration: getPreviousPerformance feeds suggestNextLoad correctly ──────
//
// This verifies the actual call path used in active.tsx: history is pulled via
// getPreviousPerformance, then the resulting sets are fed into suggestNextLoad.
// The key property being tested is that suggestion is based on the MOST RECENT
// session's sets, not an average or aggregate across all sessions.

describe("progression pipeline: getPreviousPerformance → suggestNextLoad", () => {
  it("uses only the most recent session's sets — older heavier session is ignored", () => {
    // Session 1 (older): 3 × 12 @ 80 kg — would earn a weight increase on its own.
    // Session 2 (newer): 3 × 9  @ 80 kg — within range but not at the ceiling.
    // Expected: maintain, because the recent session did not reach the ceiling.
    // If the function were averaging across sessions it might incorrectly return "increase".
    const workouts = [
      makeWorkout("w1", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      makeWorkout("w2", "2026-01-08T00:00:00.000Z", "2026-01-08T01:00:00.000Z"),
    ];
    const sets = [
      makeSet("w1", 80, 12, { rir: 2, order: 1 }),
      makeSet("w1", 80, 12, { rir: 2, order: 2 }),
      makeSet("w1", 80, 12, { rir: 2, order: 3 }),
      makeSet("w2", 80, 9, { rir: 3, order: 1 }),
      makeSet("w2", 80, 9, { rir: 3, order: 2 }),
      makeSet("w2", 80, 9, { rir: 3, order: 3 }),
    ];

    const previous = getPreviousPerformance(workouts, sets, EXERCISE_ID);
    expect(previous?.workoutId).toBe("w2"); // sanity check

    const suggestion = suggestNextLoad({
      previousSets: previous!.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
      })),
      targetRepRangeLow: 8,
      targetRepRangeHigh: 12,
      targetRir: 2,
    });

    expect(suggestion.action).toBe("maintain");
  });

  it("uses only the most recent session's sets — ignores older weaker session", () => {
    // Session 1 (older): reps fell short — would suggest decrease on its own.
    // Session 2 (newer): all sets at ceiling at target RIR — should earn increase.
    const workouts = [
      makeWorkout("w1", "2026-02-01T00:00:00.000Z", "2026-02-01T01:00:00.000Z"),
      makeWorkout("w2", "2026-02-08T00:00:00.000Z", "2026-02-08T01:00:00.000Z"),
    ];
    const sets = [
      makeSet("w1", 60, 5, { rir: 0, order: 1 }), // 5 < 8 — would trigger decrease
      makeSet("w2", 55, 12, { rir: 2, order: 1 }),
      makeSet("w2", 55, 12, { rir: 2, order: 2 }),
      makeSet("w2", 55, 12, { rir: 2, order: 3 }),
    ];

    const previous = getPreviousPerformance(workouts, sets, EXERCISE_ID);
    expect(previous?.workoutId).toBe("w2");

    const suggestion = suggestNextLoad({
      previousSets: previous!.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
      })),
      targetRepRangeLow: 8,
      targetRepRangeHigh: 12,
      targetRir: 2,
      incrementKg: 2.5,
    });

    expect(suggestion.action).toBe("increase");
    expect(suggestion.suggestedWeight).toBe(57.5);
  });
});
