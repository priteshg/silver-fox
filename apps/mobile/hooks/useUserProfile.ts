import type { Equipment, ProgrammeDifficulty, ProgrammeGoal, User } from "@silver-fox/domain";
import { useCallback, useEffect, useState } from "react";
import { getProfile, updateProfile } from "../lib/repositories/userRepository";

export function useUserProfile() {
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setProfile(await getProfile());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (updates: {
      displayName?: string;
      age?: number;
      trainingExperience?: ProgrammeDifficulty;
      goals?: ProgrammeGoal[];
      preferredTrainingDaysPerWeek?: number;
      availableEquipment?: Equipment[];
    }) => {
      const updated = await updateProfile(updates);
      setProfile(updated);
      return updated;
    },
    [],
  );

  return { profile, isLoading, refresh, save };
}
