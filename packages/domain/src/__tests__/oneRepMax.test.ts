import { describe, expect, it } from "vitest";
import { estimateOneRepMax } from "../logic/oneRepMax";

describe("estimateOneRepMax", () => {
  it("returns the raw weight for a single rep", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it("applies the Epley formula for multiple reps", () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 1);
  });

  it("rejects non-positive input", () => {
    expect(() => estimateOneRepMax(0, 5)).toThrow(RangeError);
    expect(() => estimateOneRepMax(100, 0)).toThrow(RangeError);
  });
});
