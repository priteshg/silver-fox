import { describe, expect, it } from "vitest";
import { estimateWorkoutDurationMinutes } from "../logic/duration";

describe("estimateWorkoutDurationMinutes", () => {
  it("sums active + rest time across exercises and converts to minutes", () => {
    // 4 sets * (40s active + 150s rest) = 760s; 3 sets * (40s + 120s) = 480s
    // total 1240s => ~20.67min => rounds to 21
    const minutes = estimateWorkoutDurationMinutes([
      { targetSets: 4, restSeconds: 150 },
      { targetSets: 3, restSeconds: 120 },
    ]);
    expect(minutes).toBe(21);
  });

  it("defaults rest to 90s when not specified", () => {
    const minutes = estimateWorkoutDurationMinutes([{ targetSets: 1 }]);
    expect(minutes).toBe(Math.round((40 + 90) / 60));
  });

  it("returns 0 for no exercises", () => {
    expect(estimateWorkoutDurationMinutes([])).toBe(0);
  });
});
