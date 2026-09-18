import { describe, expect, it } from "vitest";
import { calculateWeeklyStreak, countDistinctTrainedWeeks } from "../logic/consistency";

// Wednesday 2026-09-16 (UTC) — its week runs Mon 2026-09-14 to Sun 2026-09-20.
const WEDNESDAY = new Date("2026-09-16T12:00:00.000Z");

describe("calculateWeeklyStreak", () => {
  it("is zero with no workouts at all", () => {
    expect(calculateWeeklyStreak([], WEDNESDAY)).toBe(0);
  });

  it("counts the current week even if it's the only one trained", () => {
    expect(calculateWeeklyStreak(["2026-09-15T18:00:00.000Z"], WEDNESDAY)).toBe(1);
  });

  it("doesn't break the streak just because this week hasn't happened yet", () => {
    // Trained last week, nothing logged yet this week.
    const dates = ["2026-09-08T18:00:00.000Z"];
    expect(calculateWeeklyStreak(dates, WEDNESDAY)).toBe(1);
  });

  it("counts multiple consecutive trained weeks", () => {
    const dates = [
      "2026-09-15T18:00:00.000Z", // this week
      "2026-09-08T18:00:00.000Z", // last week
      "2026-09-01T18:00:00.000Z", // the week before
    ];
    expect(calculateWeeklyStreak(dates, WEDNESDAY)).toBe(3);
  });

  it("stops at the first fully-missed week", () => {
    const dates = [
      "2026-09-15T18:00:00.000Z", // this week
      // 2026-09-08 week missed entirely
      "2026-09-01T18:00:00.000Z",
    ];
    expect(calculateWeeklyStreak(dates, WEDNESDAY)).toBe(1);
  });

  it("is zero when the last session was more than a week ago and this week is empty", () => {
    const dates = ["2026-08-25T18:00:00.000Z"];
    expect(calculateWeeklyStreak(dates, WEDNESDAY)).toBe(0);
  });
});

describe("countDistinctTrainedWeeks", () => {
  it("is zero with no workouts", () => {
    expect(countDistinctTrainedWeeks([])).toBe(0);
  });

  it("counts multiple sessions in the same week as one week", () => {
    const dates = ["2026-09-14T18:00:00.000Z", "2026-09-16T18:00:00.000Z", "2026-09-18T18:00:00.000Z"];
    expect(countDistinctTrainedWeeks(dates)).toBe(1);
  });

  it("counts non-consecutive trained weeks, unlike the streak", () => {
    const dates = ["2026-09-01T18:00:00.000Z", "2026-09-15T18:00:00.000Z"];
    expect(countDistinctTrainedWeeks(dates)).toBe(2);
  });
});
