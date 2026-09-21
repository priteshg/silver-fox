import type { WorkoutDayId } from "@silver-fox/types";
import { beforeEach, describe, expect, it } from "vitest";
import { resetFakeDb } from "../../../test/fakeSupabase";
import { fakeSupabaseDb } from "../../../vitest.setup";
import { addDayToProgram, createProgram, deleteDay, getProgramDetail } from "../programRepository";

describe("programme day management", () => {
  beforeEach(() => {
    resetFakeDb(fakeSupabaseDb);
  });

  it("adds a day to an existing programme with the next order slot", async () => {
    const created = await createProgram({ name: "My Split", dayNames: ["Push", "Pull"] });

    const day = await addDayToProgram(created.program.id, { name: "Legs", focus: "legs" });
    expect(day.order).toBe(2);

    const detail = await getProgramDetail(created.program.id);
    expect(detail?.days.map((d) => d.day.name)).toEqual(["Push", "Pull", "Legs"]);
  });

  it("removes a day and its exercises, and renumbers the remaining days densely", async () => {
    const created = await createProgram({ name: "My Split", dayNames: ["Push", "Pull", "Legs"] });
    const pullDay = created.days.find((d) => d.day.name === "Pull")!;

    await deleteDay(pullDay.day.id);

    const detail = await getProgramDetail(created.program.id);
    expect(detail?.days.map((d) => d.day.name)).toEqual(["Push", "Legs"]);
    expect(detail?.days.map((d) => d.day.order)).toEqual([0, 1]);
  });

  it("does nothing when asked to delete a day that no longer exists", async () => {
    const created = await createProgram({ name: "My Split", dayNames: ["Push"] });
    await deleteDay(("missing_" + created.program.id) as WorkoutDayId);
    const detail = await getProgramDetail(created.program.id);
    expect(detail?.days).toHaveLength(1);
  });
});
