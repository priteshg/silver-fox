import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRestTimer } from "../useRestTimer";

describe("useRestTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is idle until started", () => {
    const { result } = renderHook(() => useRestTimer());
    expect(result.current.isRunning).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it("counts down after starting", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => result.current.start(90));
    expect(result.current.isRunning).toBe(true);
    expect(result.current.remainingSeconds).toBe(90);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.remainingSeconds).toBe(60);
  });

  it("can be skipped", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => result.current.start(90));
    act(() => result.current.cancel());
    expect(result.current.isRunning).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it("supports adding time on top of what's remaining", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => result.current.start(30));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingSeconds).toBe(20);

    act(() => result.current.start(result.current.remainingSeconds + 15));
    expect(result.current.remainingSeconds).toBe(35);
  });

  it("reaches zero and stops running on its own", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => result.current.start(5));
    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it("pausing freezes the remaining time", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => result.current.start(60));
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(result.current.remainingSeconds).toBe(40);

    act(() => result.current.pause());
    expect(result.current.isPaused).toBe(true);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingSeconds).toBe(40);
  });

  it("resuming continues the countdown from where it was paused", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => result.current.start(60));
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    act(() => result.current.pause());
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    act(() => result.current.resume());
    expect(result.current.isPaused).toBe(false);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingSeconds).toBe(30);
  });

  it("adding time while running extends the countdown without pausing it", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => result.current.start(60));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    act(() => result.current.addTime(15));
    expect(result.current.isPaused).toBe(false);
    expect(result.current.remainingSeconds).toBe(65);
  });

  it("adding time while paused only extends the paused snapshot, it does not resume", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => result.current.start(60));
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    act(() => result.current.pause());
    expect(result.current.remainingSeconds).toBe(40);

    act(() => result.current.addTime(15));
    expect(result.current.isPaused).toBe(true);
    expect(result.current.remainingSeconds).toBe(55);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current.remainingSeconds).toBe(55);
  });
});
