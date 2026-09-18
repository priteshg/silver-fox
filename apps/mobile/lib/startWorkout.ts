import type { SessionExerciseConfig, WorkoutSession } from "@silver-fox/domain";
import { Alert } from "react-native";
import type { ProgramDayDetail } from "./repositories/programRepository";

export function buildSessionExercises(day: ProgramDayDetail): SessionExerciseConfig[] {
  return day.exercises.map((programExercise, index) => ({
    exerciseId: programExercise.exerciseId,
    programExerciseId: programExercise.id,
    order: index,
    targetSets: programExercise.targetSets,
    targetRepRangeLow: programExercise.targetRepRangeLow,
    targetRepRangeHigh: programExercise.targetRepRangeHigh,
    targetRir: programExercise.targetRir,
    restSeconds: programExercise.restSeconds,
    tempo: programExercise.tempo,
  }));
}

/** Warns before discarding a workout already in progress. */
export function confirmAndStart(params: {
  existingSession: WorkoutSession | null;
  onConfirmed: () => void;
}) {
  if (!params.existingSession) {
    params.onConfirmed();
    return;
  }
  Alert.alert(
    "Replace current workout?",
    `You have "${params.existingSession.dayName}" in progress. Starting a new workout will discard it.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Start New", style: "destructive", onPress: params.onConfirmed },
    ],
  );
}
