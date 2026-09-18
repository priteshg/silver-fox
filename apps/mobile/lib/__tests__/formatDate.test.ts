import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "../formatDate";

const now = new Date("2026-01-15T12:00:00.000Z");

describe("formatRelativeDate", () => {
  it("says Today for the same day", () => {
    expect(formatRelativeDate("2026-01-15T08:00:00.000Z", now)).toBe("Today");
  });

  it("says Yesterday for one day ago", () => {
    expect(formatRelativeDate("2026-01-14T08:00:00.000Z", now)).toBe("Yesterday");
  });

  it("counts days for under a week", () => {
    expect(formatRelativeDate("2026-01-11T08:00:00.000Z", now)).toBe("4 days ago");
  });

  it("counts weeks for under 5 weeks", () => {
    expect(formatRelativeDate("2026-01-01T08:00:00.000Z", now)).toBe("2 weeks ago");
  });

  it("falls back to a locale date further back", () => {
    expect(formatRelativeDate("2025-11-01T08:00:00.000Z", now)).toBe(
      new Date("2025-11-01T08:00:00.000Z").toLocaleDateString(),
    );
  });
});
