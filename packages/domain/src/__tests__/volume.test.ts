import { describe, expect, it } from "vitest";
import { calculateSetVolume, calculateTotalVolume } from "../logic/volume";

describe("calculateSetVolume", () => {
  it("multiplies weight by reps", () => {
    expect(calculateSetVolume({ weight: 60, reps: 10 })).toBe(600);
  });
});

describe("calculateTotalVolume", () => {
  it("sums volume across sets", () => {
    const sets = [
      { weight: 60, reps: 10 },
      { weight: 80, reps: 5 },
    ];
    expect(calculateTotalVolume(sets)).toBe(1000);
  });

  it("returns 0 for an empty list", () => {
    expect(calculateTotalVolume([])).toBe(0);
  });
});
