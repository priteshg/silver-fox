import type { MobilityFocus, MobilitySession } from "@silver-fox/domain";
import { useCallback, useEffect, useState } from "react";
import { listMobilitySessions, logMobilitySession } from "../lib/repositories/mobilityRepository";

export function useMobility() {
  const [sessions, setSessions] = useState<MobilitySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const loaded = await listMobilitySessions();
    setSessions([...loaded].sort((a, b) => (a.date < b.date ? 1 : -1)));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const log = useCallback(
    async (input: { focus: MobilityFocus; durationMinutes: number; date: string; notes?: string }) => {
      await logMobilitySession(input);
      await refresh();
    },
    [refresh],
  );

  return { sessions, isLoading, refresh, log };
}
