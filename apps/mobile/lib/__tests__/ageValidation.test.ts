import { describe, expect, it } from "vitest";
import { isAgeInRange, MAX_AGE, MIN_AGE } from "../ageValidation";

/** Moved here from Playwright's profile.spec.ts age-boundary loop (4 full page round-trips) — see E2E_PERFORMANCE_AUDIT.md §2. */
describe("isAgeInRange", () => {
  it.each([
    ["minimum (13)", MIN_AGE, true],
    ["maximum (120)", MAX_AGE, true],
    ["one below minimum (12)", MIN_AGE - 1, false],
    ["one above maximum (121)", MAX_AGE + 1, false],
    ["typical (47)", 47, true],
  ])("%s", (_label, age, expected) => {
    expect(isAgeInRange(age)).toBe(expected);
  });
});
