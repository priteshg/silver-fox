import {
  calculateTotalVolume,
  estimateWorkoutDurationMinutes,
  selectNextWorkoutDay,
  type Exercise,
  type Program,
  type ProgramExercise,
  type Workout,
  type WorkoutDay,
  type WorkoutSet,
} from "@silver-fox/domain";
import { useCallback, useEffect, useState } from "react";
import {
  getProgramDetail,
  getSelectedProgramId,
  listPrograms,
  listWorkoutDays,
  type ProgramDetail,
} from "../lib/repositories/programRepository";
import { listWorkouts, listWorkoutSets } from "../lib/repositories/workoutRepository";

export interface RecentWorkoutSummary {
  workout: Workout;
  dayName: string;
  totalVolume: number;
}

export interface TodaysWorkoutPlan {
  program: Program;
  day: WorkoutDay;
  exercises: (ProgramExercise & { exercise: Exercise })[];
  estimatedDurationMinutes: number;
  lastCompleted: RecentWorkoutSummary | null;
}

function summarize(workout: Workout, dayName: string, sets: WorkoutSet[]): RecentWorkoutSummary {
  return { workout, dayName, totalVolume: calculateTotalVolume(sets) };
}

/** The user's active programme — the one selected in the catalogue, falling back to the first available. */
function resolveActiveProgram(programs: Program[], selectedProgramId: string): Program | null {
  return programs.find((program) => program.id === selectedProgramId) ?? programs[0] ?? null;
}

export function useWorkoutHome() {
  const [programDetail, setProgramDetail] = useState<ProgramDetail | null>(null);
  const [todaysPlan, setTodaysPlan] = useState<TodaysWorkoutPlan | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkoutSummary[]>([]);
  const [allWorkouts, setAllWorkouts] = useState<RecentWorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [programs, selectedProgramId, allDays, workouts, sets] = await Promise.all([
      listPrograms(),
      getSelectedProgramId(),
      listWorkoutDays(),
      listWorkouts(),
      listWorkoutSets(),
    ]);

    const dayNameById = new Map(allDays.map((day) => [day.id, day.name]));
    const setsByWorkoutId = new Map<string, WorkoutSet[]>();
    for (const set of sets) {
      const list = setsByWorkoutId.get(set.workoutId) ?? [];
      list.push(set);
      setsByWorkoutId.set(set.workoutId, list);
    }

    const completed = workouts
      .filter((workout) => workout.completedAt)
      .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1));

    const summarized = completed.map((workout) =>
      summarize(
        workout,
        (workout.workoutDayId && dayNameById.get(workout.workoutDayId)) ?? "Workout",
        setsByWorkoutId.get(workout.id) ?? [],
      ),
    );
    setAllWorkouts(summarized);
    setRecentWorkouts(summarized.slice(0, 5));

    const activeProgram = resolveActiveProgram(programs, selectedProgramId);
    if (!activeProgram) {
      setProgramDetail(null);
      setTodaysPlan(null);
      setIsLoading(false);
      return;
    }

    const detail = await getProgramDetail(activeProgram.id);
    setProgramDetail(detail);
    if (!detail || detail.days.length === 0) {
      setTodaysPlan(null);
      setIsLoading(false);
      return;
    }

    const lastForProgram = completed.find((workout) => workout.programId === detail.program.id);
    const nextDay = selectNextWorkoutDay(
      detail.days.map((d) => d.day),
      lastForProgram?.workoutDayId ?? null,
    );
    const dayDetail = nextDay ? detail.days.find((d) => d.day.id === nextDay.id) : undefined;

    if (!dayDetail || dayDetail.exercises.length === 0) {
      setTodaysPlan(null);
      setIsLoading(false);
      return;
    }

    const lastCompletedWorkout =
      completed.find((workout) => workout.workoutDayId === dayDetail.day.id) ?? null;

    setTodaysPlan({
      program: detail.program,
      day: dayDetail.day,
      exercises: dayDetail.exercises,
      estimatedDurationMinutes: estimateWorkoutDurationMinutes(
        dayDetail.exercises.map((pe) => ({
          targetSets: pe.targetSets,
          restSeconds: pe.restSeconds,
        })),
      ),
      lastCompleted: lastCompletedWorkout
        ? summarize(
            lastCompletedWorkout,
            dayDetail.day.name,
            setsByWorkoutId.get(lastCompletedWorkout.id) ?? [],
          )
        : null,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { programDetail, todaysPlan, recentWorkouts, allWorkouts, isLoading, refresh };
}
