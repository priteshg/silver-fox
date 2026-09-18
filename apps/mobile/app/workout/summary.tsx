import type { Theme } from "@silver-fox/config";
import { buildWorkoutSummary, type Workout, type WorkoutSet } from "@silver-fox/domain";
import { Button, Card, StatNumber, useTheme } from "@silver-fox/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components";
import { useExerciseLibrary } from "../../hooks/useExerciseLibrary";
import { formatRecordLine } from "../../lib/formatRecord";
import { getProgramDetail } from "../../lib/repositories/programRepository";
import { listWorkouts, listWorkoutSets } from "../../lib/repositories/workoutRepository";

function formatMinutes(minutes: number): string {
  return `${minutes}m`;
}

export default function WorkoutSummaryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { exercises } = useExerciseLibrary();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [priorSets, setPriorSets] = useState<WorkoutSet[]>([]);
  const [previousSessionSets, setPreviousSessionSets] = useState<WorkoutSet[] | null>(null);
  const [totalPlannedExercises, setTotalPlannedExercises] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [workouts, allSets] = await Promise.all([listWorkouts(), listWorkoutSets()]);
      const thisWorkout = workouts.find((w) => w.id === workoutId) ?? null;
      const thisSets = allSets.filter((s) => s.workoutId === workoutId);
      const otherSets = allSets.filter((s) => s.workoutId !== workoutId);

      setWorkout(thisWorkout);
      setSets(thisSets);
      setPriorSets(otherSets);

      if (thisWorkout?.workoutDayId) {
        const previousWorkout = workouts
          .filter((w) => w.id !== workoutId && w.workoutDayId === thisWorkout.workoutDayId && w.completedAt)
          .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))[0];
        setPreviousSessionSets(
          previousWorkout ? allSets.filter((s) => s.workoutId === previousWorkout.id) : null,
        );
      } else {
        setPreviousSessionSets(null);
      }

      if (thisWorkout?.programId && thisWorkout.workoutDayId) {
        const detail = await getProgramDetail(thisWorkout.programId);
        const day = detail?.days.find((d) => d.day.id === thisWorkout.workoutDayId);
        setTotalPlannedExercises(day?.exercises.length ?? new Set(thisSets.map((s) => s.exerciseId)).size);
      } else {
        setTotalPlannedExercises(new Set(thisSets.map((s) => s.exerciseId)).size);
      }

      setIsLoading(false);
    }
    void load();
  }, [workoutId]);

  if (isLoading || !workout) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>Loading…</Text>
      </ScreenContainer>
    );
  }

  const summary = buildWorkoutSummary({
    workout,
    sets,
    totalPlannedExercises,
    priorSets,
    previousSessionSets,
  });

  const volumeDelta = summary.previousSessionComparison
    ? summary.totalVolume - summary.previousSessionComparison.totalVolume
    : null;

  return (
    <ScreenContainer>
      <Text style={styles.title}>Workout Complete</Text>

      <Card elevated>
        <View style={styles.statsRow}>
          <StatNumber value={formatMinutes(summary.durationMinutes)} label="Duration" />
          <StatNumber value={`${summary.exercisesCompleted}/${summary.totalPlannedExercises}`} label="Exercises" />
          <StatNumber value={summary.totalSets} label="Sets" />
        </View>
        <View style={styles.spacer} />
        <View style={styles.statsRow}>
          <StatNumber value={summary.totalVolume} label="Total Volume" />
        </View>
        {volumeDelta !== null ? (
          <Text style={[styles.deltaText, volumeDelta > 0 && styles.deltaPositive]}>
            {volumeDelta > 0 ? "▲" : volumeDelta < 0 ? "▼" : "—"} {Math.abs(volumeDelta)} volume vs last session (
            {summary.previousSessionComparison?.totalVolume})
          </Text>
        ) : null}
      </Card>

      {summary.personalRecords.length > 0 ? (
        <Card elevated>
          <Text style={styles.sectionTitle}>Personal Records</Text>
          <View style={styles.list}>
            {summary.personalRecords.map((record, index) => {
              const name = exercises.find((e) => e.id === record.exerciseId)?.name ?? "Exercise";
              return (
                <Text key={index} style={styles.prLine}>
                  {formatRecordLine(record, name)}
                </Text>
              );
            })}
          </View>
        </Card>
      ) : null}

      <Button label="Done" onPress={() => router.replace("/")} />
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    muted: {
      color: theme.color.textSecondary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
    title: {
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.textPrimary,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    spacer: {
      height: theme.spacing.md,
    },
    deltaText: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
    },
    deltaPositive: {
      color: theme.color.accentText,
    },
    sectionTitle: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    list: {
      gap: theme.spacing.xs,
    },
    prLine: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textPrimary,
      fontWeight: "600",
    },
  });
}
