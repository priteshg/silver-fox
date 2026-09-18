import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatElapsed, useElapsedSeconds } from "../useElapsedSeconds";

describe("formatElapsed", () => {
  it("formats minutes and seconds", () => {
    expect(formatElapsed(65)).toBe("1:05");
  });

  it("formats hours when the workout runs long", () => {
    expect(formatElapsed(3725)).toBe("1:02:05");
  });
});

describe("useElapsedSeconds", () => {
  it("counts up from the start time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const { result } = renderHook(() => useElapsedSeconds("2026-01-01T00:00:00.000Z"));
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(result.current).toBe(65);

    vi.useRealTimers();
  });
});
