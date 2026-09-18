import { buildWeeklyOverview, type WeekDayOverview } from "@silver-fox/domain";
import { useCallback, useEffect, useState } from "react";
import { listConditioningSessions } from "../lib/repositories/conditioningRepository";
import { listMobilitySessions } from "../lib/repositories/mobilityRepository";
import { listWorkoutDays } from "../lib/repositories/programRepository";
import { listWorkouts } from "../lib/repositories/workoutRepository";

/** The current Monday-to-Sunday week, read from everything logged so far. */
export function useWeeklyOverview() {
  const [week, setWeek] = useState<WeekDayOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [days, workouts, conditioningSessions, mobilitySessions] = await Promise.all([
      listWorkoutDays(),
      listWorkouts(),
      listConditioningSessions(),
      listMobilitySessions(),
    ]);
    const focusByDayId = new Map(days.map((day) => [day.id, day.focus]));
    const completedStrengthDays = workouts.flatMap((workout) => {
      const focus = workout.workoutDayId && focusByDayId.get(workout.workoutDayId);
      return workout.completedAt && focus ? [{ completedAt: workout.completedAt, focus }] : [];
    });

    setWeek(
      buildWeeklyOverview({
        referenceDate: new Date(),
        completedStrengthDays,
        conditioningSessions,
        mobilitySessions,
      }),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { week, isLoading, refresh };
}
