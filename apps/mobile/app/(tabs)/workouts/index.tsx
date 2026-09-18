import { Button, Card, EmptyState, LoadingState, useTheme } from "@silver-fox/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../../components";
import { LOCAL_USER_ID } from "../../../data/currentUser";
import { useConditioning } from "../../../hooks/useConditioning";
import { useMobility } from "../../../hooks/useMobility";
import { useWorkoutHome } from "../../../hooks/useWorkoutHome";
import { formatRelativeDate } from "../../../lib/formatDate";
import { getProgramDetail, getSelectedProgramId, listPrograms, type ProgramDetail } from "../../../lib/repositories/programRepository";
import { buildSessionExercises, confirmAndStart } from "../../../lib/startWorkout";
import { useActiveSession } from "../../../providers/ActiveSessionProvider";
import type { Theme } from "@silver-fox/config";

const CONDITIONING_LABELS: Record<string, string> = {
  zone2: "Zone 2",
  running: "Running",
  cycling: "Cycling",
  walking: "Walking",
  intervals: "Intervals",
  other: "Cardio",
};

const MOBILITY_LABELS: Record<string, string> = {
  hips: "Hips",
  thoracic_spine: "Thoracic Spine",
  shoulders: "Shoulders",
  ankles: "Ankles",
  general: "General Recovery",
};

export default function WorkoutsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { session, startSession } = useActiveSession();
  const { allWorkouts, refresh: refreshHistory } = useWorkoutHome();
  const { sessions: conditioningSessions, refresh: refreshConditioning } = useConditioning();
  const { sessions: mobilitySessions, refresh: refreshMobility } = useMobility();
  const [activeDetail, setActiveDetail] = useState<ProgramDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const [programs, selectedProgramId] = await Promise.all([listPrograms(), getSelectedProgramId()]);
    const activeProgram = programs.find((program) => program.id === selectedProgramId) ?? programs[0] ?? null;
    setActiveDetail(activeProgram ? await getProgramDetail(activeProgram.id) : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshHistory();
      void refreshConditioning();
      void refreshMobility();
    }, [load, refreshHistory, refreshConditioning, refreshMobility]),
  );

  const recentConditioning = conditioningSessions.slice(0, 3);
  const recentMobility = mobilitySessions.slice(0, 3);

  function handleStart(detail: ProgramDetail, dayId: string) {
    const day = detail.days.find((d) => d.day.id === dayId);
    if (!day || day.exercises.length === 0) return;
    confirmAndStart({
      existingSession: session,
      onConfirmed: () => {
        startSession({
          userId: LOCAL_USER_ID,
          programId: detail.program.id,
          workoutDayId: day.day.id,
          dayName: day.day.name,
          exercises: buildSessionExercises(day),
        });
        router.push("/workout/active");
      },
    });
  }

  return (
    <ScreenContainer>
      <Text style={styles.screenTitle}>Workouts</Text>

      {isLoading ? (
        <LoadingState label="Loading programme…" />
      ) : !activeDetail ? (
        <EmptyState
          title="No programme selected"
          description="Browse the catalogue to pick a programme to follow."
          actionLabel="Browse Programmes"
          onAction={() => router.push("/programs")}
        />
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Start a Workout</Text>
            <Pressable onPress={() => router.push(`/programs/${activeDetail.program.id}`)} accessibilityRole="button">
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          </View>
          <Card>
            <Text style={styles.programName}>{activeDetail.program.name}</Text>
            <View style={styles.spacer} />
            {activeDetail.days.map((d) => (
              <Pressable
                key={d.day.id}
                style={styles.dayRow}
                onPress={() => handleStart(activeDetail, d.day.id)}
                disabled={d.exercises.length === 0}
                accessibilityRole="button"
                accessibilityLabel={`Start ${d.day.name}`}
              >
                <Text style={[styles.dayName, d.exercises.length === 0 && styles.dayNameDisabled]}>
                  {d.day.name}
                </Text>
                <Text style={styles.dayMeta}>
                  {d.exercises.length === 0 ? "No exercises yet" : `${d.exercises.length} exercises`}
                </Text>
              </Pressable>
            ))}
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cardio &amp; Mobility</Text>
        <Card>
          <View style={styles.logButtonRow}>
            <View style={styles.logButton}>
              <Button label="Log Cardio" variant="secondary" onPress={() => router.push("/workouts/log-cardio")} />
            </View>
            <View style={styles.logButton}>
              <Button label="Log Mobility" variant="secondary" onPress={() => router.push("/workouts/log-mobility")} />
            </View>
          </View>
          {recentConditioning.length > 0 || recentMobility.length > 0 ? (
            <View style={styles.list}>
              {recentConditioning.map((entry) => (
                <View key={entry.id} style={styles.historyRow}>
                  <Text style={styles.historyDayName}>{CONDITIONING_LABELS[entry.type]}</Text>
                  <Text style={styles.historyMeta}>
                    {formatRelativeDate(entry.date)} · {entry.durationMinutes} min
                  </Text>
                </View>
              ))}
              {recentMobility.map((entry) => (
                <View key={entry.id} style={styles.historyRow}>
                  <Text style={styles.historyDayName}>{MOBILITY_LABELS[entry.focus]}</Text>
                  <Text style={styles.historyMeta}>
                    {formatRelativeDate(entry.date)} · {entry.durationMinutes} min
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>Nothing logged yet — a short session still counts.</Text>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        {allWorkouts.length === 0 ? (
          <Text style={styles.muted}>Your completed workouts will show up here.</Text>
        ) : (
          <View style={styles.list}>
            {allWorkouts.map((entry) => (
              <View key={entry.workout.id} style={styles.historyRow}>
                <Text style={styles.historyDayName}>{entry.dayName}</Text>
                <Text style={styles.historyMeta}>
                  {formatRelativeDate(entry.workout.completedAt!)} · {entry.totalVolume} vol
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    screenTitle: {
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.textPrimary,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    changeLink: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.color.accentText,
    },
    muted: {
      color: theme.color.textSecondary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
    programName: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
    },
    spacer: {
      height: theme.spacing.sm,
    },
    logButtonRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    logButton: {
      flex: 1,
    },
    dayRow: {
      minHeight: theme.touchTarget.comfortable,
      justifyContent: "center",
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
      paddingVertical: theme.spacing.sm,
    },
    dayName: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "600",
      color: theme.color.textPrimary,
    },
    dayNameDisabled: {
      color: theme.color.textTertiary,
    },
    dayMeta: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textSecondary,
    },
    list: {
      gap: theme.spacing.sm,
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
    },
    historyMeta: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textSecondary,
    },
  });
}
