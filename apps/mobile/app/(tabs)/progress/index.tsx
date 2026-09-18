import type { Theme } from "@silver-fox/config";
import { calculateCurrentRecords, calculateWeeklyStreak, countDistinctTrainedWeeks } from "@silver-fox/domain";
import { Button, Card, EmptyState, useTheme } from "@silver-fox/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer, Stepper } from "../../../components";
import { useConditioning } from "../../../hooks/useConditioning";
import { useExerciseLibrary } from "../../../hooks/useExerciseLibrary";
import { usePhysique } from "../../../hooks/usePhysique";
import { useWorkoutHistory } from "../../../hooks/useWorkoutHistory";
import { formatRelativeDate } from "../../../lib/formatDate";

type ProgressTab = "strength" | "fitness" | "physique" | "consistency";

const TABS: { value: ProgressTab; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "fitness", label: "Fitness" },
  { value: "physique", label: "Physique" },
  { value: "consistency", label: "Consistency" },
];

const DAY_MS = 1000 * 60 * 60 * 24;

export default function ProgressScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const [tab, setTab] = useState<ProgressTab>("strength");

  const { exercises, refresh: refreshExercises } = useExerciseLibrary();
  const { workouts, sets, refresh: refreshHistory, isLoading: isLoadingStrength } = useWorkoutHistory();
  const { sessions: conditioningSessions, refresh: refreshConditioning } = useConditioning();
  const { measurements, photos, refresh: refreshPhysique, logMeasurement } = usePhysique();

  useFocusEffect(
    useCallback(() => {
      void refreshExercises();
      void refreshHistory();
      void refreshConditioning();
      void refreshPhysique();
    }, [refreshExercises, refreshHistory, refreshConditioning, refreshPhysique]),
  );

  const trained = useMemo(() => {
    const exerciseIds = new Set(sets.map((s) => s.exerciseId));
    return exercises
      .filter((exercise) => exerciseIds.has(exercise.id))
      .map((exercise) => ({
        exercise,
        records: calculateCurrentRecords(sets.filter((s) => s.exerciseId === exercise.id)),
      }))
      .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));
  }, [exercises, sets]);

  // Date.now() is a side effect, so this recomputes in an effect rather than
  // during render (React's purity rule for hooks disallows impure calls,
  // like reading the current time, inside a render-time useMemo).
  const [last7Days, setLast7Days] = useState({ minutes: 0, sessionCount: 0 });
  useEffect(() => {
    const cutoff = Date.now() - 7 * DAY_MS;
    const recent = conditioningSessions.filter((session) => new Date(session.date).getTime() >= cutoff);
    setLast7Days({
      minutes: recent.reduce((total, session) => total + session.durationMinutes, 0),
      sessionCount: recent.length,
    });
  }, [conditioningSessions]);

  const completedWorkouts = useMemo(() => workouts.filter((w) => w.completedAt), [workouts]);
  const [consistency, setConsistency] = useState({ streak: 0, weeksTrained: 0 });
  useEffect(() => {
    const completedAtDates = completedWorkouts.flatMap((w) => (w.completedAt ? [w.completedAt] : []));
    setConsistency({
      streak: calculateWeeklyStreak(completedAtDates, new Date()),
      weeksTrained: countDistinctTrainedWeeks(completedAtDates),
    });
  }, [completedWorkouts]);

  const [weightKg, setWeightKg] = useState(0);
  const [waistCm, setWaistCm] = useState(0);
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);

  async function handleLogMeasurement() {
    setIsSavingMeasurement(true);
    await logMeasurement({
      date: new Date().toISOString(),
      weightKg: weightKg > 0 ? weightKg : undefined,
      waistCm: waistCm > 0 ? waistCm : undefined,
    });
    setWeightKg(0);
    setWaistCm(0);
    setIsSavingMeasurement(false);
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Progress</Text>

      <View style={styles.tabRow} accessibilityRole="tablist" accessibilityLabel="Progress dimension">
        {TABS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setTab(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === option.value }}
            accessibilityLabel={`${option.label} progress`}
            style={[styles.tab, tab === option.value && styles.tabSelected]}
          >
            <Text style={[styles.tabLabel, tab === option.value && styles.tabLabelSelected]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "strength" ? (
        !isLoadingStrength && trained.length === 0 ? (
          <EmptyState
            title="No progress yet"
            description="Complete a workout to start tracking weight, volume, and estimated 1RM per exercise."
          />
        ) : (
          <View style={styles.list}>
            {trained.map(({ exercise, records }) => (
              <Pressable
                key={exercise.id}
                style={styles.row}
                onPress={() => router.push(`/exercises/${exercise.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`View progress for ${exercise.name}`}
              >
                <View>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>{exercise.primaryMuscleGroup.replace("_", " ")}</Text>
                </View>
                {records ? (
                  <View style={styles.recordsColumn}>
                    <Text style={styles.recordValue}>{records.heaviestWeight} kg</Text>
                    <Text style={styles.recordLabel}>heaviest</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      {tab === "fitness" ? (
        <>
          <Card elevated>
            <Text style={styles.sectionTitle}>Last 7 Days</Text>
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statValue}>{last7Days.minutes}</Text>
                <Text style={styles.statLabel}>cardio minutes</Text>
              </View>
              <View>
                <Text style={styles.statValue}>{last7Days.sessionCount}</Text>
                <Text style={styles.statLabel}>sessions</Text>
              </View>
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {conditioningSessions.length === 0 ? (
              <Text style={styles.muted}>No cardio logged yet — even a short walk counts.</Text>
            ) : (
              <View style={styles.list}>
                {conditioningSessions.slice(0, 6).map((session) => (
                  <View key={session.id} style={styles.historyRow}>
                    <Text style={styles.historyDayName}>{session.type}</Text>
                    <Text style={styles.historyMeta}>
                      {formatRelativeDate(session.date)} · {session.durationMinutes} min
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.spacer} />
            <Button label="Log Cardio" variant="secondary" onPress={() => router.push("/workouts/log-cardio")} />
          </Card>
        </>
      ) : null}

      {tab === "physique" ? (
        <>
          <Card elevated>
            <Text style={styles.sectionTitle}>Today&apos;s Check-in</Text>
            <Stepper label="Weight" value={weightKg} min={0} max={200} step={0.5} suffix="kg" onChange={setWeightKg} />
            <View style={styles.spacer} />
            <Stepper label="Waist" value={waistCm} min={0} max={200} step={0.5} suffix="cm" onChange={setWaistCm} />
            <View style={styles.spacer} />
            <Button
              label="Save Measurement"
              onPress={handleLogMeasurement}
              disabled={isSavingMeasurement || (weightKg === 0 && waistCm === 0)}
            />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Trend</Text>
            {measurements.length === 0 ? (
              <Text style={styles.muted}>Log a measurement to start seeing your trend over time.</Text>
            ) : (
              <View style={styles.list}>
                {measurements.slice(0, 6).map((entry) => (
                  <View key={entry.id} style={styles.historyRow}>
                    <Text style={styles.historyDayName}>{formatRelativeDate(entry.date)}</Text>
                    <Text style={styles.historyMeta}>
                      {[
                        entry.weightKg ? `${entry.weightKg} kg` : null,
                        entry.waistCm ? `${entry.waistCm} cm waist` : null,
                        entry.bodyFatPercent ? `${entry.bodyFatPercent}% BF` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Progress Photos</Text>
            {photos.length === 0 ? (
              <Text style={styles.muted}>No photos yet.</Text>
            ) : (
              <Text style={styles.muted}>{photos.length} photo{photos.length === 1 ? "" : "s"} logged.</Text>
            )}
          </Card>
        </>
      ) : null}

      {tab === "consistency" ? (
        <>
          <Card elevated>
            <Text style={styles.sectionTitle}>Showing Up</Text>
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statValue}>{completedWorkouts.length}</Text>
                <Text style={styles.statLabel}>sessions completed</Text>
              </View>
              <View>
                <Text style={styles.statValue}>{consistency.weeksTrained}</Text>
                <Text style={styles.statLabel}>weeks trained</Text>
              </View>
              <View>
                <Text style={styles.statValue}>{consistency.streak}</Text>
                <Text style={styles.statLabel}>week streak</Text>
              </View>
            </View>
          </Card>
          <Text style={styles.consistencyNote}>
            Consistency compounds. Showing up for a moderate session beats skipping for a perfect one.
          </Text>
        </>
      ) : null}
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    title: {
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.textPrimary,
    },
    tabRow: {
      flexDirection: "row",
      gap: 2,
      backgroundColor: theme.color.surfaceElevated,
      borderRadius: theme.radius.pill,
      padding: 2,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: 2,
      borderRadius: theme.radius.pill,
      alignItems: "center",
    },
    tabSelected: {
      backgroundColor: theme.color.accent,
    },
    tabLabel: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: "600",
      color: theme.color.textSecondary,
    },
    tabLabelSelected: {
      color: theme.color.background,
    },
    sectionTitle: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    muted: {
      color: theme.color.textSecondary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
    spacer: {
      height: theme.spacing.md,
    },
    statsRow: {
      flexDirection: "row",
      gap: theme.spacing.xl,
    },
    statValue: {
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.accentText,
      fontVariant: ["tabular-nums"],
    },
    statLabel: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textSecondary,
    },
    consistencyNote: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontStyle: "italic",
      color: theme.color.textTertiary,
    },
    list: {
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: theme.touchTarget.comfortable,
      backgroundColor: theme.color.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    exerciseName: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "600",
      color: theme.color.textPrimary,
    },
    exerciseMeta: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textSecondary,
      textTransform: "capitalize",
    },
    recordsColumn: {
      alignItems: "flex-end",
    },
    recordValue: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "700",
      color: theme.color.accentText,
      fontVariant: ["tabular-nums"],
    },
    recordLabel: {
      fontSize: 10,
      color: theme.color.textTertiary,
      textTransform: "uppercase",
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.color.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      minHeight: theme.touchTarget.min,
    },
    historyDayName: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "600",
      color: theme.color.textPrimary,
      textTransform: "capitalize",
    },
    historyMeta: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textSecondary,
    },
  });
}
