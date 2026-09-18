import { describe, expect, it } from "vitest";
import { reorderByIndex } from "../logic/reorder";

describe("reorderByIndex", () => {
  it("moves an item and renumbers order", () => {
    const items = [
      { id: "a", order: 0 },
      { id: "b", order: 1 },
      { id: "c", order: 2 },
    ];
    const result = reorderByIndex(items, 0, 2);
    expect(result.map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(result.map((item) => item.order)).toEqual([0, 1, 2]);
  });

  it("returns the sorted list unchanged for an out-of-range index", () => {
    const items = [
      { id: "a", order: 0 },
      { id: "b", order: 1 },
    ];
    expect(reorderByIndex(items, 0, 5)).toEqual(items);
  });
});
