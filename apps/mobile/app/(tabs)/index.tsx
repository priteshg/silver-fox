import type { Theme } from "@silver-fox/config";
import { calculateTotalVolume, calculateWeeklyStreak, findMostRecentPersonalRecord } from "@silver-fox/domain";
import { Card, useTheme } from "@silver-fox/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { HeroSection, MetricCard, PrimaryCTA, ScreenContainer, SectionHeader, WeeklyOverview } from "../../components";
import { LOCAL_USER_ID } from "../../data/currentUser";
import { useExerciseLibrary } from "../../hooks/useExerciseLibrary";
import { usePhysique } from "../../hooks/usePhysique";
import { useWeeklyOverview } from "../../hooks/useWeeklyOverview";
import { useWorkoutHistory } from "../../hooks/useWorkoutHistory";
import { useWorkoutHome } from "../../hooks/useWorkoutHome";
import { formatRecordDetail } from "../../lib/formatRecord";
import { formatRelativeDate } from "../../lib/formatDate";
import { buildSessionExercises, confirmAndStart } from "../../lib/startWorkout";
import { useActiveSession } from "../../providers/ActiveSessionProvider";
import { useAppTheme, type ThemePreference } from "../../providers/ThemeProvider";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const TRAINING_PRINCIPLES = [
  "Strength isn't about lifting the most weight in the gym. It's about remaining capable.",
  "Two good years of consistent training beat two months of heroic training.",
  "Leave a rep or two in the tank when the exercise demands it.",
  "Your goal isn't to peak for summer. It's to still be strong at 60.",
  "Muscle is something worth protecting.",
  "Progress doesn't require destroying yourself.",
];

const DAY_MS = 1000 * 60 * 60 * 24;

function muscleSummary(muscleGroups: string[]): string {
  const unique = Array.from(new Set(muscleGroups));
  return unique.map((group) => group.charAt(0).toUpperCase() + group.slice(1).replace("_", " ")).join(" • ");
}

export default function Home() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { session, startSession } = useActiveSession();
  const { programDetail, todaysPlan, recentWorkouts, isLoading, refresh } = useWorkoutHome();
  const { week, refresh: refreshWeek } = useWeeklyOverview();
  const { workouts, sets, refresh: refreshHistory } = useWorkoutHistory();
  const { exercises, refresh: refreshExercises } = useExerciseLibrary();
  const { measurements, refresh: refreshPhysique } = usePhysique();
  const { preference, setPreference } = useAppTheme();

  // A stable pick for this mount rather than a per-render Date.now() read —
  // it only needs to feel like it changes day to day, not be exactly right.
  const [principle] = useState(() => TRAINING_PRINCIPLES[new Date().getDate() % TRAINING_PRINCIPLES.length]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshWeek();
      void refreshHistory();
      void refreshExercises();
      void refreshPhysique();
    }, [refresh, refreshWeek, refreshHistory, refreshExercises, refreshPhysique]),
  );

  const [weeklyVolume, setWeeklyVolume] = useState(0);
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const cutoff = Date.now() - 7 * DAY_MS;
    const recentWorkoutIds = new Set(
      workouts.filter((w) => w.completedAt && new Date(w.completedAt).getTime() >= cutoff).map((w) => w.id),
    );
    setWeeklyVolume(calculateTotalVolume(sets.filter((s) => recentWorkoutIds.has(s.workoutId))));
    setStreak(
      calculateWeeklyStreak(
        workouts.flatMap((w) => (w.completedAt ? [w.completedAt] : [])),
        new Date(),
      ),
    );
  }, [workouts, sets]);

  const recentPr = useMemo(() => {
    const result = findMostRecentPersonalRecord(workouts, sets);
    if (!result) return null;
    const exerciseName = exercises.find((e) => e.id === result.record.exerciseId)?.name ?? "Exercise";
    return { exerciseName, detail: formatRecordDetail(result.record) };
  }, [workouts, sets, exercises]);

  const latestMeasurement = measurements[0] ?? null;

  function handleStartToday() {
    if (!todaysPlan) return;
    confirmAndStart({
      existingSession: session,
      onConfirmed: () => {
        startSession({
          userId: LOCAL_USER_ID,
          programId: todaysPlan.program.id,
          workoutDayId: todaysPlan.day.id,
          dayName: todaysPlan.day.name,
          exercises: todaysPlan.exercises.map((pe, index) => ({
            exerciseId: pe.exerciseId,
            programExerciseId: pe.id,
            order: index,
            targetSets: pe.targetSets,
            targetRepRangeLow: pe.targetRepRangeLow,
            targetRepRangeHigh: pe.targetRepRangeHigh,
            targetRir: pe.targetRir,
            restSeconds: pe.restSeconds,
            tempo: pe.tempo,
          })),
        });
        router.push("/workout/active");
      },
    });
  }

  function handleStartDay(dayId: string) {
    if (!programDetail) return;
    const day = programDetail.days.find((d) => d.day.id === dayId);
    if (!day || day.exercises.length === 0) return;
    confirmAndStart({
      existingSession: session,
      onConfirmed: () => {
        startSession({
          userId: LOCAL_USER_ID,
          programId: programDetail.program.id,
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
      <HeroSection title="Build Your Next Decade." subtitle="Strength. Muscle. Fitness. Mobility. Built for life after 40.">
        <Text style={styles.principle}>“{principle}”</Text>
      </HeroSection>

      {session ? (
        <Card elevated>
          <Text style={styles.eyebrow}>Workout In Progress</Text>
          <Text style={styles.dayName}>{session.dayName}</Text>
          <Text style={styles.cardBody}>Pick up where you left off.</Text>
          <View style={styles.spacer} />
          <PrimaryCTA label="Resume Workout" onPress={() => router.push("/workout/active")} />
        </Card>
      ) : todaysPlan ? (
        <Card elevated>
          <Text style={styles.eyebrow}>Today</Text>
          <Text style={styles.dayName}>{todaysPlan.day.name}</Text>
          <Text style={styles.cardBody}>{muscleSummary(todaysPlan.exercises.map((pe) => pe.exercise.primaryMuscleGroup))}</Text>
          <Text style={styles.metaLine}>
            {todaysPlan.exercises.length} exercises · ~{todaysPlan.estimatedDurationMinutes} min
          </Text>
          {todaysPlan.lastCompleted ? (
            <Text style={styles.metaLine}>
              Last {todaysPlan.lastCompleted.dayName}: {formatRelativeDate(todaysPlan.lastCompleted.workout.completedAt!)}{" "}
              · {todaysPlan.lastCompleted.totalVolume} vol
            </Text>
          ) : null}
          <View style={styles.spacer} />
          <PrimaryCTA label="Start Workout" subLabel={todaysPlan.day.name} onPress={handleStartToday} />
        </Card>
      ) : programDetail && programDetail.days.length > 0 ? (
        <Card elevated>
          <Text style={styles.cardHeading}>Choose a workout</Text>
          <Text style={styles.cardBody}>
            {programDetail.program.name} doesn&apos;t have a workout ready for today — pick a day to start.
          </Text>
          <View style={styles.spacer} />
          {programDetail.days.map((d) => (
            <Pressable
              key={d.day.id}
              style={styles.dayRow}
              onPress={() => handleStartDay(d.day.id)}
              disabled={d.exercises.length === 0}
              accessibilityRole="button"
              accessibilityLabel={`Start ${d.day.name}`}
            >
              <Text style={[styles.dayRowName, d.exercises.length === 0 && styles.dayRowNameDisabled]}>
                {d.day.name}
              </Text>
              <Text style={styles.dayRowMeta}>
                {d.exercises.length === 0 ? "No exercises yet" : `${d.exercises.length} exercises`}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : !isLoading ? (
        <Card elevated>
          <Text style={styles.cardHeading}>Create your first programme</Text>
          <Text style={styles.cardBody}>Build a training programme to start logging workouts.</Text>
          <View style={styles.spacer} />
          <PrimaryCTA label="New Programme" onPress={() => router.push("/programs/new")} />
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="This Week" title="Your Training Week" />
        <WeeklyOverview week={week} />
        <Text style={styles.conditioningNote}>Strength keeps you capable. Cardiovascular fitness keeps you going.</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Your Numbers" />
        <View style={styles.metricsGrid}>
          <MetricCard value={String(streak)} label="Current Streak" caption={streak === 1 ? "week trained" : "weeks trained"} />
          <MetricCard value={programDetail?.program.name ?? "—"} label="Programme" compact />
          <MetricCard value={recentPr?.exerciseName ?? "—"} label="Recent PR" caption={recentPr?.detail} compact />
          <MetricCard value={String(weeklyVolume)} label="Training Volume" caption="last 7 days" />
          <MetricCard
            value={latestMeasurement?.weightKg ? `${latestMeasurement.weightKg} kg` : "—"}
            label="Bodyweight"
          />
          <MetricCard value={latestMeasurement?.waistCm ? `${latestMeasurement.waistCm} cm` : "—"} label="Waist" />
        </View>
      </View>

      {recentWorkouts.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Recent Workouts" />
          <View style={styles.list}>
            {recentWorkouts.map((entry) => (
              <View key={entry.workout.id} style={styles.historyRow}>
                <Text style={styles.historyDayName}>{entry.dayName}</Text>
                <Text style={styles.historyMeta}>
                  {formatRelativeDate(entry.workout.completedAt!)} · {entry.totalVolume} vol
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.themeRow} accessibilityRole="tablist" accessibilityLabel="Appearance">
        {THEME_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setPreference(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: preference === option.value }}
            accessibilityLabel={`${option.label} appearance`}
            style={[styles.themeOption, preference === option.value && styles.themeOptionSelected]}
          >
            <Text style={[styles.themeOptionLabel, preference === option.value && styles.themeOptionLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    principle: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontStyle: "italic",
      color: theme.color.textSecondary,
      maxWidth: 320,
    },
    section: {
      gap: theme.spacing.sm,
    },
    eyebrow: {
      fontSize: theme.typography.typeScale.eyebrow.fontSize,
      fontWeight: theme.typography.typeScale.eyebrow.fontWeight,
      letterSpacing: theme.typography.typeScale.eyebrow.letterSpacing,
      color: theme.color.accentText,
      textTransform: "uppercase",
    },
    dayName: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.textPrimary,
    },
    cardHeading: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
    },
    cardBody: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
    },
    metaLine: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
    },
    spacer: {
      height: theme.spacing.md,
    },
    dayRow: {
      minHeight: theme.touchTarget.comfortable,
      justifyContent: "center",
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
      paddingVertical: theme.spacing.sm,
    },
    dayRowName: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "600",
      color: theme.color.textPrimary,
    },
    dayRowNameDisabled: {
      color: theme.color.textTertiary,
    },
    dayRowMeta: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textSecondary,
    },
    conditioningNote: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
    },
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
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
    themeRow: {
      alignSelf: "center",
      flexDirection: "row",
      gap: 2,
      backgroundColor: theme.color.surfaceElevated,
      borderRadius: theme.radius.pill,
      padding: 2,
    },
    themeOption: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
    },
    themeOptionSelected: {
      backgroundColor: theme.color.accent,
    },
    themeOptionLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.color.textSecondary,
    },
    themeOptionLabelSelected: {
      color: theme.color.background,
    },
  });
}
