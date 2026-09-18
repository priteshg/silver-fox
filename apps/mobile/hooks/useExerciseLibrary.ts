import type { Exercise } from "@silver-fox/domain";
import { useCallback, useEffect, useState } from "react";
import { createExercise, loadExercises } from "../lib/repositories/exerciseRepository";

export function useExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setExercises(await loadExercises());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addExercise = useCallback(
    async (input: Omit<Exercise, "id" | "createdAt" | "updatedAt" | "isCustom">) => {
      const exercise = await createExercise(input);
      await refresh();
      return exercise;
    },
    [refresh],
  );

  return { exercises, isLoading, refresh, addExercise };
}
