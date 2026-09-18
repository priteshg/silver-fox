import type { ConditioningSession, ConditioningType } from "@silver-fox/domain";
import { useCallback, useEffect, useState } from "react";
import { listConditioningSessions, logConditioningSession } from "../lib/repositories/conditioningRepository";

export function useConditioning() {
  const [sessions, setSessions] = useState<ConditioningSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const loaded = await listConditioningSessions();
    setSessions([...loaded].sort((a, b) => (a.date < b.date ? 1 : -1)));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const log = useCallback(
    async (input: { type: ConditioningType; durationMinutes: number; date: string; notes?: string }) => {
      await logConditioningSession(input);
      await refresh();
    },
    [refresh],
  );

  return { sessions, isLoading, refresh, log };
}
