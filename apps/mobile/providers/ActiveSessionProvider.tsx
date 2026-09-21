import {
  addSet as domainAddSet,
  completeSet as domainCompleteSet,
  createSession as domainCreateSession,
  finishSession as domainFinishSession,
  removeSet as domainRemoveSet,
  revertSubstitution as domainRevertSubstitution,
  substituteExercise as domainSubstituteExercise,
  uncompleteSet as domainUncompleteSet,
  updateExerciseTarget as domainUpdateExerciseTarget,
  type SessionExerciseConfig,
  type Workout,
  type WorkoutSession,
  type WorkoutSet,
} from "@silver-fox/domain";
import type { ExerciseId, ProgramId, UserId, WeightUnit, WorkoutDayId } from "@silver-fox/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
} from "../lib/repositories/sessionRepository";
import { saveCompletedWorkout } from "../lib/repositories/workoutRepository";

interface ActiveSessionContextValue {
  session: WorkoutSession | null;
  isLoading: boolean;
  startSession: (params: {
    userId: UserId;
    programId?: ProgramId;
    workoutDayId?: WorkoutDayId;
    dayName: string;
    exercises: SessionExerciseConfig[];
  }) => void;
  addSet: (sessionExerciseId: string) => void;
  removeSet: (sessionExerciseId: string, sessionSetId: string) => void;
  completeSet: (
    sessionExerciseId: string,
    sessionSetId: string,
    values: { weight: number; reps: number; rir?: number },
  ) => void;
  uncompleteSet: (sessionExerciseId: string, sessionSetId: string) => void;
  updateExerciseTarget: (
    sessionExerciseId: string,
    updates: {
      targetRepRangeLow?: number;
      targetRepRangeHigh?: number;
      targetRir?: number;
      restSeconds?: number;
    },
  ) => void;
  substituteExercise: (sessionExerciseId: string, newExerciseId: ExerciseId) => void;
  revertSubstitution: (sessionExerciseId: string) => void;
  finishSession: (weightUnit: WeightUnit) => Promise<{ workout: Workout; sets: WorkoutSet[] } | null>;
  discardSession: () => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null);

/**
 * Every mutating action below uses the `setSession(prev => ...)` functional
 * updater form, and is wrapped in `useCallback` with an empty dependency
 * array. That makes them referentially stable across renders — even though
 * `session` itself changes on every set logged — so a screen that memoizes
 * per-row components (e.g. `SetRow` via `React.memo`) actually gets to skip
 * re-rendering rows that didn't change, instead of the whole set list
 * re-rendering on every completed set.
 */
export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<WorkoutSession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    loadActiveSession()
      .then(setSession)
      .finally(() => setIsLoading(false));
  }, []);

  const persist = useCallback((next: WorkoutSession) => {
    void saveActiveSession(next);
  }, []);

  const startSession = useCallback<ActiveSessionContextValue["startSession"]>(
    (params) => {
      const next = domainCreateSession(params);
      setSession(next);
      persist(next);
    },
    [persist],
  );

  const addSet = useCallback<ActiveSessionContextValue["addSet"]>(
    (sessionExerciseId) => {
      setSession((current) => {
        if (!current) return current;
        const next = domainAddSet(current, sessionExerciseId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeSet = useCallback<ActiveSessionContextValue["removeSet"]>(
    (sessionExerciseId, sessionSetId) => {
      setSession((current) => {
        if (!current) return current;
        const next = domainRemoveSet(current, sessionExerciseId, sessionSetId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const completeSet = useCallback<ActiveSessionContextValue["completeSet"]>(
    (sessionExerciseId, sessionSetId, values) => {
      setSession((current) => {
        if (!current) return current;
        const next = domainCompleteSet(current, sessionExerciseId, sessionSetId, values);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const uncompleteSet = useCallback<ActiveSessionContextValue["uncompleteSet"]>(
    (sessionExerciseId, sessionSetId) => {
      setSession((current) => {
        if (!current) return current;
        const next = domainUncompleteSet(current, sessionExerciseId, sessionSetId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateExerciseTarget = useCallback<ActiveSessionContextValue["updateExerciseTarget"]>(
    (sessionExerciseId, updates) => {
      setSession((current) => {
        if (!current) return current;
        const next = domainUpdateExerciseTarget(current, sessionExerciseId, updates);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const substituteExercise = useCallback<ActiveSessionContextValue["substituteExercise"]>(
    (sessionExerciseId, newExerciseId) => {
      setSession((current) => {
        if (!current) return current;
        const next = domainSubstituteExercise(current, sessionExerciseId, newExerciseId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const revertSubstitution = useCallback<ActiveSessionContextValue["revertSubstitution"]>(
    (sessionExerciseId) => {
      setSession((current) => {
        if (!current) return current;
        const next = domainRevertSubstitution(current, sessionExerciseId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const finishSession = useCallback<ActiveSessionContextValue["finishSession"]>(async (weightUnit) => {
    const current = sessionRef.current;
    if (!current) return null;
    const result = domainFinishSession(current, weightUnit);
    await saveCompletedWorkout(result.workout, result.sets);
    await clearActiveSession();
    setSession(null);
    return result;
  }, []);

  const discardSession = useCallback<ActiveSessionContextValue["discardSession"]>(() => {
    setSession(null);
    void clearActiveSession();
  }, []);

  const value = useMemo<ActiveSessionContextValue>(
    () => ({
      session,
      isLoading,
      startSession,
      addSet,
      removeSet,
      completeSet,
      uncompleteSet,
      updateExerciseTarget,
      substituteExercise,
      revertSubstitution,
      finishSession,
      discardSession,
    }),
    [
      session,
      isLoading,
      startSession,
      addSet,
      removeSet,
      completeSet,
      uncompleteSet,
      updateExerciseTarget,
      substituteExercise,
      revertSubstitution,
      finishSession,
      discardSession,
    ],
  );

  return <ActiveSessionContext.Provider value={value}>{children}</ActiveSessionContext.Provider>;
}

export function useActiveSession(): ActiveSessionContextValue {
  const context = useContext(ActiveSessionContext);
  if (!context) {
    throw new Error("useActiveSession must be used within an ActiveSessionProvider");
  }
  return context;
}
