import type { Exercise, ProgramExercise } from "@silver-fox/domain";
import type { ProgramId, WorkoutDayId } from "@silver-fox/types";
import { useCallback, useEffect, useState } from "react";
import {
  addExerciseToDay,
  getProgramDetail,
  removeProgramExercise,
  renameDay,
  reorderDayExercises,
  updateProgramExercise,
  updateProgramInfo,
  type ProgramDetail,
} from "../lib/repositories/programRepository";

export function useProgramDetail(programId: ProgramId) {
  const [detail, setDetail] = useState<ProgramDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setDetail(await getProgramDetail(programId));
    setIsLoading(false);
  }, [programId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateInfo = useCallback(
    async (updates: { name?: string; description?: string }) => {
      await updateProgramInfo(programId, updates);
      await refresh();
    },
    [programId, refresh],
  );

  const renameWorkoutDay = useCallback(
    async (dayId: WorkoutDayId, name: string) => {
      await renameDay(dayId, name);
      await refresh();
    },
    [refresh],
  );

  const addExercise = useCallback(
    async (
      dayId: WorkoutDayId,
      config: {
        exerciseId: Exercise["id"];
        targetSets: number;
        targetRepRangeLow: number;
        targetRepRangeHigh: number;
        targetRir?: number;
        restSeconds?: number;
      },
    ) => {
      await addExerciseToDay(dayId, config);
      await refresh();
    },
    [refresh],
  );

  const updateExercise = useCallback(
    async (
      programExerciseId: ProgramExercise["id"],
      updates: Partial<
        Pick<
          ProgramExercise,
          "targetSets" | "targetRepRangeLow" | "targetRepRangeHigh" | "targetRir" | "restSeconds"
        >
      >,
    ) => {
      await updateProgramExercise(programExerciseId, updates);
      await refresh();
    },
    [refresh],
  );

  const removeExercise = useCallback(
    async (programExerciseId: ProgramExercise["id"]) => {
      await removeProgramExercise(programExerciseId);
      await refresh();
    },
    [refresh],
  );

  const moveExercise = useCallback(
    async (dayId: WorkoutDayId, fromIndex: number, toIndex: number) => {
      await reorderDayExercises(dayId, fromIndex, toIndex);
      await refresh();
    },
    [refresh],
  );

  return {
    detail,
    isLoading,
    refresh,
    updateInfo,
    renameWorkoutDay,
    addExercise,
    updateExercise,
    removeExercise,
    moveExercise,
  };
}
