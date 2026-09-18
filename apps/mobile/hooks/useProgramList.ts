import type { Program } from "@silver-fox/domain";
import type { ProgramId } from "@silver-fox/types";
import { useCallback, useEffect, useState } from "react";
import {
  createProgram,
  deleteProgram,
  getSelectedProgramId,
  listPrograms,
  setSelectedProgramId,
} from "../lib/repositories/programRepository";

export function useProgramList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramIdState] = useState<ProgramId | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [loadedPrograms, selectedId] = await Promise.all([listPrograms(), getSelectedProgramId()]);
    setPrograms(loadedPrograms);
    setSelectedProgramIdState(selectedId);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: { name: string; description?: string; dayNames: string[] }) => {
      const detail = await createProgram(input);
      await refresh();
      return detail.program;
    },
    [refresh],
  );

  const remove = useCallback(
    async (programId: Program["id"]) => {
      await deleteProgram(programId);
      await refresh();
    },
    [refresh],
  );

  const selectProgram = useCallback(
    async (programId: ProgramId) => {
      await setSelectedProgramId(programId);
      setSelectedProgramIdState(programId);
    },
    [],
  );

  return { programs, selectedProgramId, isLoading, refresh, create, remove, selectProgram };
}
