import {
  getPreviousPerformance,
  summarizeExerciseHistory,
  type Workout,
  type WorkoutSet,
} from "@silver-fox/domain";
import type { ExerciseId } from "@silver-fox/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listWorkoutSets, listWorkouts } from "../lib/repositories/workoutRepository";

export function useWorkoutHistory() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [loadedWorkouts, loadedSets] = await Promise.all([listWorkouts(), listWorkoutSets()]);
    setWorkouts(loadedWorkouts);
    setSets(loadedSets);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const historyByExercise = useCallback(
    (exerciseId: ExerciseId) => summarizeExerciseHistory(workouts, sets, exerciseId),
    [workouts, sets],
  );

  const previousPerformance = useCallback(
    (exerciseId: ExerciseId) => getPreviousPerformance(workouts, sets, exerciseId),
    [workouts, sets],
  );

  return useMemo(
    () => ({ workouts, sets, isLoading, refresh, historyByExercise, previousPerformance }),
    [workouts, sets, isLoading, refresh, historyByExercise, previousPerformance],
  );
}
