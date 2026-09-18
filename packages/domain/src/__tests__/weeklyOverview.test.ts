import { describe, expect, it } from "vitest";
import { buildWeeklyOverview } from "../logic/weeklyOverview";

// Wednesday 2026-09-16 (UTC) — the week's Monday is 2026-09-14, Sunday is 2026-09-20.
const WEDNESDAY = new Date("2026-09-16T12:00:00.000Z");

describe("buildWeeklyOverview", () => {
  it("builds the Monday-to-Sunday week containing the reference date", () => {
    const week = buildWeeklyOverview({
      referenceDate: WEDNESDAY,
      completedStrengthDays: [],
      conditioningSessions: [],
      mobilitySessions: [],
    });

    expect(week.map((day) => day.date)).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
      "2026-09-20",
    ]);
  });

  it("marks days after today as future rather than rest", () => {
    const week = buildWeeklyOverview({
      referenceDate: WEDNESDAY,
      completedStrengthDays: [],
      conditioningSessions: [],
      mobilitySessions: [],
    });

    const wednesday = week.find((day) => day.date === "2026-09-16")!;
    const thursday = week.find((day) => day.date === "2026-09-17")!;
    expect(wednesday.isFuture).toBe(false);
    expect(wednesday.isToday).toBe(true);
    expect(wednesday.category).toBe("rest");
    expect(thursday.isFuture).toBe(true);
    expect(thursday.category).toBeNull();
  });

  it("categorises a completed strength day by its focus", () => {
    const week = buildWeeklyOverview({
      referenceDate: WEDNESDAY,
      completedStrengthDays: [{ completedAt: "2026-09-15T18:00:00.000Z", focus: "pull" }],
      conditioningSessions: [],
      mobilitySessions: [],
    });

    expect(week.find((day) => day.date === "2026-09-15")!.category).toBe("pull");
  });

  it("falls back non-PPL focuses to a generic strength category", () => {
    const week = buildWeeklyOverview({
      referenceDate: WEDNESDAY,
      completedStrengthDays: [{ completedAt: "2026-09-15T18:00:00.000Z", focus: "full_body" }],
      conditioningSessions: [],
      mobilitySessions: [],
    });

    expect(week.find((day) => day.date === "2026-09-15")!.category).toBe("strength");
  });

  it("shows a conditioning session as cardio when there is no strength session that day", () => {
    const week = buildWeeklyOverview({
      referenceDate: WEDNESDAY,
      completedStrengthDays: [],
      conditioningSessions: [{ date: "2026-09-14T07:00:00.000Z" }],
      mobilitySessions: [],
    });

    expect(week.find((day) => day.date === "2026-09-14")!.category).toBe("cardio");
  });

  it("shows a mobility session as recovery when nothing else happened that day", () => {
    const week = buildWeeklyOverview({
      referenceDate: WEDNESDAY,
      completedStrengthDays: [],
      conditioningSessions: [],
      mobilitySessions: [{ date: "2026-09-14T07:00:00.000Z" }],
    });

    expect(week.find((day) => day.date === "2026-09-14")!.category).toBe("recovery");
  });

  it("prioritises a strength session over cardio and recovery on the same day", () => {
    const week = buildWeeklyOverview({
      referenceDate: WEDNESDAY,
      completedStrengthDays: [{ completedAt: "2026-09-14T18:00:00.000Z", focus: "legs" }],
      conditioningSessions: [{ date: "2026-09-14T07:00:00.000Z" }],
      mobilitySessions: [{ date: "2026-09-14T08:00:00.000Z" }],
    });

    expect(week.find((day) => day.date === "2026-09-14")!.category).toBe("legs");
  });

  it("treats a past day with nothing logged as rest", () => {
    const week = buildWeeklyOverview({
      referenceDate: WEDNESDAY,
      completedStrengthDays: [],
      conditioningSessions: [],
      mobilitySessions: [],
    });

    expect(week.find((day) => day.date === "2026-09-14")!.category).toBe("rest");
  });
});
