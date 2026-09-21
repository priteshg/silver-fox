import { describe, expect, it } from "vitest";
import { suggestNextLoad } from "../logic/loadProgression";

describe("suggestNextLoad", () => {
  it("has no suggestion when there's no prior data", () => {
    const result = suggestNextLoad({ previousSets: [], targetRepRangeLow: 8, targetRepRangeHigh: 12, targetRir: 2 });
    expect(result.action).toBe("maintain");
    expect(result.suggestedWeight).toBeNull();
  });

  it("maintains the load when reps are in range but not at the top", () => {
    // 10kg x 10, 10, 9 — target 8-12 @ 2 RIR: within range, not all at the ceiling.
    const result = suggestNextLoad({
      previousSets: [
        { weight: 10, reps: 10, rir: 2 },
        { weight: 10, reps: 10, rir: 2 },
        { weight: 10, reps: 9, rir: 2 },
      ],
      targetRepRangeLow: 8,
      targetRepRangeHigh: 12,
      targetRir: 2,
    });
    expect(result.action).toBe("maintain");
    expect(result.suggestedWeight).toBe(10);
  });

  it("increases the load when every set hits the top of the range at target RIR", () => {
    const result = suggestNextLoad({
      previousSets: [
        { weight: 10, reps: 12, rir: 2 },
        { weight: 10, reps: 12, rir: 2 },
        { weight: 10, reps: 12, rir: 2 },
      ],
      targetRepRangeLow: 8,
      targetRepRangeHigh: 12,
      targetRir: 2,
      incrementKg: 2.5,
    });
    expect(result.action).toBe("increase");
    expect(result.suggestedWeight).toBe(12.5);
  });

  it("does not increase when reps hit the top but RIR came in below target (too hard already)", () => {
    const result = suggestNextLoad({
      previousSets: [
        { weight: 10, reps: 12, rir: 0 },
        { weight: 10, reps: 12, rir: 0 },
        { weight: 10, reps: 12, rir: 0 },
      ],
      targetRepRangeLow: 8,
      targetRepRangeHigh: 12,
      targetRir: 2,
    });
    expect(result.action).toBe("maintain");
  });

  it("decreases the load when a set falls short of the rep range", () => {
    const result = suggestNextLoad({
      previousSets: [
        { weight: 20, reps: 8, rir: 2 },
        { weight: 20, reps: 6, rir: 1 },
      ],
      targetRepRangeLow: 8,
      targetRepRangeHigh: 12,
      targetRir: 2,
      incrementKg: 2.5,
    });
    expect(result.action).toBe("decrease");
    expect(result.suggestedWeight).toBe(17.5);
  });

  // The weight input/stepper, storage, and display all support fractional
  // kilograms (see PROGRESSION_LOGIC_AUDIT.md, Risk 1, and
  // components/SetRow.tsx's 0.5kg step) specifically so a suggestion like
  // this one is always representable, never rounded away by the UI.
  describe("fractional-weight consistency", () => {
    it("suggests a whole-number weight when the increment lands on one", () => {
      const result = suggestNextLoad({
        previousSets: [
          { weight: 80, reps: 10, rir: 2 },
          { weight: 80, reps: 10, rir: 2 },
          { weight: 80, reps: 10, rir: 2 },
        ],
        targetRepRangeLow: 6,
        targetRepRangeHigh: 10,
        targetRir: 2,
        incrementKg: 5,
      });
      expect(result.action).toBe("increase");
      expect(result.suggestedWeight).toBe(85);
    });

    it("suggests a fractional weight (82.5 kg) when the increment doesn't land on a whole number", () => {
      const result = suggestNextLoad({
        previousSets: [
          { weight: 80, reps: 10, rir: 2 },
          { weight: 80, reps: 10, rir: 2 },
          { weight: 80, reps: 10, rir: 2 },
        ],
        targetRepRangeLow: 6,
        targetRepRangeHigh: 10,
        targetRir: 2,
        incrementKg: 2.5,
      });
      expect(result.action).toBe("increase");
      expect(result.suggestedWeight).toBe(82.5);
    });
  });

  it("never suggests a negative weight", () => {
    const result = suggestNextLoad({
      previousSets: [{ weight: 1, reps: 2, rir: 0 }],
      targetRepRangeLow: 8,
      targetRepRangeHigh: 12,
      incrementKg: 2.5,
    });
    expect(result.suggestedWeight).toBeGreaterThanOrEqual(0);
  });
});
