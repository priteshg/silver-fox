import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A countdown timer driven by a wall-clock end time rather than a ticking
 * counter, so it stays correct even if the JS timer is throttled while the
 * screen is backgrounded. Pausing freezes the remaining time instead of the
 * end time, so resuming recomputes a fresh end time from wherever it was
 * paused.
 */
export function useRestTimer() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (endsAt === null || pausedRemaining !== null) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (endsAt === null) setRemainingSeconds(0);
      return;
    }
    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
      if (secondsLeft === 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endsAt, pausedRemaining]);

  const start = useCallback((durationSeconds: number) => {
    setPausedRemaining(null);
    setEndsAt(Date.now() + durationSeconds * 1000);
  }, []);

  const cancel = useCallback(() => {
    setEndsAt(null);
    setPausedRemaining(null);
  }, []);

  const pause = useCallback(() => {
    setPausedRemaining(remainingSeconds);
  }, [remainingSeconds]);

  const resume = useCallback(() => {
    if (pausedRemaining === null) return;
    setEndsAt(Date.now() + pausedRemaining * 1000);
    setPausedRemaining(null);
  }, [pausedRemaining]);

  /** Adds time to whichever is currently authoritative — the paused snapshot or the running end time — without changing pause state. */
  const addTime = useCallback((seconds: number) => {
    setPausedRemaining((prev) => (prev === null ? prev : prev + seconds));
    setEndsAt((prev) => (prev === null ? prev : prev + seconds * 1000));
  }, []);

  const isPaused = pausedRemaining !== null;
  const displaySeconds = isPaused ? (pausedRemaining as number) : remainingSeconds;

  return {
    remainingSeconds: displaySeconds,
    isRunning: endsAt !== null && displaySeconds > 0,
    isPaused,
    start,
    cancel,
    pause,
    resume,
    addTime,
  };
}
