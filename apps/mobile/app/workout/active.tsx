import type { Theme } from "@silver-fox/config";
import {
  findPersonalRecords,
  suggestNextLoad,
  type ExerciseSessionSummary,
  type PersonalRecord,
  type SessionExercise,
} from "@silver-fox/domain";
import { Button, Card, useTheme } from "@silver-fox/ui";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Chip, ExerciseMediaView, RestTimerBar, ScreenContainer, SetRow, Stepper } from "../../components";
import { useExerciseLibrary } from "../../hooks/useExerciseLibrary";
import { formatElapsed, useElapsedSeconds } from "../../hooks/useElapsedSeconds";
import { useRestTimer } from "../../hooks/useRestTimer";
import { useWorkoutHistory } from "../../hooks/useWorkoutHistory";
import { haptics } from "../../lib/haptics";
import { useActiveSession } from "../../providers/ActiveSessionProvider";

const DEFAULT_REST_SECONDS = 90;
const PR_BANNER_DURATION_MS = 4000;

function prefillFor(previous: ExerciseSessionSummary | null, setNumber: number) {
  if (!previous || previous.sets.length === 0) return {};
  const matching = previous.sets.find((s) => s.order === setNumber) ?? previous.sets[previous.sets.length - 1];
  return matching ? { weight: matching.weight, reps: matching.reps, rir: matching.rir } : {};
}

function formatPrMessage(record: PersonalRecord, exerciseName: string): string {
  if (record.type === "weight") return `New PR — ${exerciseName}: ${record.value} kg`;
  if (record.type === "estimatedOneRepMax") return `New PR — ${exerciseName}: ${record.value} kg est. 1RM`;
  return `New PR — ${exerciseName}: ${record.value} reps @ ${record.atWeight} kg`;
}

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const {
    session,
    addSet,
    removeSet,
    completeSet,
    uncompleteSet,
    updateExerciseTarget,
    finishSession,
    discardSession,
  } = useActiveSession();
  const { exercises } = useExerciseLibrary();
  const { previousPerformance, sets: historySets } = useWorkoutHistory();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [prBanner, setPrBanner] = useState<{ record: PersonalRecord; exerciseName: string } | null>(null);
  const {
    start: startRestTimer,
    cancel: cancelRestTimer,
    pause: pauseRestTimer,
    resume: resumeRestTimer,
    addTime: addRestTime,
    remainingSeconds: restRemainingSeconds,
    isRunning: isRestRunning,
    isPaused: isRestPaused,
  } = useRestTimer();
  const elapsedSeconds = useElapsedSeconds(session?.startedAt ?? new Date().toISOString());

  const activeExercise: SessionExercise | undefined =
    session?.exercises.find((e) => e.id === selectedExerciseId) ?? session?.exercises[0];
  const activeSessionExerciseId = activeExercise?.id;
  const activeExerciseId = activeExercise?.exerciseId;
  const activeRestSeconds = activeExercise?.restSeconds;
  const activeIndex = session?.exercises.findIndex((e) => e.id === activeExercise?.id) ?? -1;

  const exerciseInfo = useMemo(
    () => exercises.find((e) => e.id === activeExerciseId),
    [exercises, activeExerciseId],
  );

  const previous = activeExerciseId ? previousPerformance(activeExerciseId) : null;

  const loadSuggestion = useMemo(() => {
    if (!previous || previous.sets.length === 0 || !activeExercise) return null;
    return suggestNextLoad({
      previousSets: previous.sets.map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir })),
      targetRepRangeLow: activeExercise.targetRepRangeLow,
      targetRepRangeHigh: activeExercise.targetRepRangeHigh,
      targetRir: activeExercise.targetRir,
    });
  }, [previous, activeExercise]);

  const totalSets = session?.exercises.reduce((total, e) => total + e.sets.length, 0) ?? 0;
  const completedSets =
    session?.exercises.reduce((total, e) => total + e.sets.filter((s) => s.completed).length, 0) ?? 0;
  const nextSetId = activeExercise?.sets.find((s) => !s.completed)?.id;

  useEffect(() => {
    if (!prBanner) return;
    const timeout = setTimeout(() => setPrBanner(null), PR_BANNER_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [prBanner]);

  const handleCompleteSet = useCallback(
    (setId: string, values: { weight: number; reps: number; rir?: number }) => {
      if (!activeSessionExerciseId) return;
      completeSet(activeSessionExerciseId, setId, values);
      startRestTimer(activeRestSeconds ?? DEFAULT_REST_SECONDS);

      if (activeExerciseId) {
        const priorForExercise = historySets.filter((s) => s.exerciseId === activeExerciseId);
        const newRecords = findPersonalRecords(priorForExercise, [{ exerciseId: activeExerciseId, ...values }]);
        if (newRecords.length > 0) {
          void haptics.success();
          setPrBanner({
            record: newRecords[0] as PersonalRecord,
            exerciseName: exerciseInfo?.name ?? "Exercise",
          });
        }
      }
    },
    [activeSessionExerciseId, activeExerciseId, activeRestSeconds, completeSet, startRestTimer, historySets, exerciseInfo],
  );

  const handleUncompleteSet = useCallback(
    (setId: string) => {
      if (!activeSessionExerciseId) return;
      uncompleteSet(activeSessionExerciseId, setId);
    },
    [activeSessionExerciseId, uncompleteSet],
  );

  const handleRemoveSet = useCallback(
    (setId: string) => {
      if (!activeSessionExerciseId) return;
      removeSet(activeSessionExerciseId, setId);
    },
    [activeSessionExerciseId, removeSet],
  );

  const handleAddSet = useCallback(() => {
    if (!activeSessionExerciseId) return;
    addSet(activeSessionExerciseId);
  }, [activeSessionExerciseId, addSet]);

  if (!session || !activeExercise) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>No active workout.</Text>
        <Button label="Back Home" onPress={() => router.replace("/")} />
      </ScreenContainer>
    );
  }

  function handleFinish() {
    Alert.alert("Finish workout?", "This will save your logged sets and end the session.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Finish",
        onPress: async () => {
          const result = await finishSession("kg");
          if (result) {
            router.replace(`/workout/summary?workoutId=${result.workout.id}`);
          } else {
            router.replace("/");
          }
        },
      },
    ]);
  }

  function handleDiscard() {
    Alert.alert("Discard workout?", "Nothing will be saved.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          discardSession();
          router.replace("/");
        },
      },
    ]);
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.topBar}>
        <Pressable onPress={handleDiscard} hitSlop={12} accessibilityRole="button" accessibilityLabel="Discard workout">
          <Text style={styles.discardLabel}>Discard</Text>
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.dayName}>{session.dayName}</Text>
          <Text style={styles.elapsed}>{formatElapsed(elapsedSeconds)}</Text>
        </View>
        <Pressable onPress={handleFinish} hitSlop={12} accessibilityRole="button" accessibilityLabel="Finish workout">
          <Text style={styles.finishLabel}>Finish</Text>
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }]} />
      </View>
      <Text style={styles.progressLabel} accessibilityLiveRegion="polite">
        Exercise {activeIndex + 1} of {session.exercises.length} · {completedSets}/{totalSets} sets
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseTabs}>
        {session.exercises.map((sessionExercise) => {
          const info = exercises.find((e) => e.id === sessionExercise.exerciseId);
          const doneCount = sessionExercise.sets.filter((s) => s.completed).length;
          return (
            <Chip
              key={sessionExercise.id}
              label={`${info?.name ?? "Exercise"} (${doneCount}/${sessionExercise.sets.length})`}
              selected={sessionExercise.id === activeExercise.id}
              onPress={() => setSelectedExerciseId(sessionExercise.id)}
            />
          );
        })}
      </ScrollView>

      {prBanner ? (
        <View style={styles.prBanner} accessible accessibilityLiveRegion="assertive">
          <Text style={styles.prBannerText}>{formatPrMessage(prBanner.record, prBanner.exerciseName)}</Text>
        </View>
      ) : null}

      {isRestRunning ? (
        <View style={styles.stickyTimer}>
          <RestTimerBar
            remainingSeconds={restRemainingSeconds}
            totalSeconds={activeRestSeconds ?? DEFAULT_REST_SECONDS}
            isPaused={isRestPaused}
            onSkip={cancelRestTimer}
            onAddTime={addRestTime}
            onPause={pauseRestTimer}
            onResume={resumeRestTimer}
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.mediaSpacer}>
            <ExerciseMediaView
              media={exerciseInfo?.media}
              exerciseName={exerciseInfo?.name ?? "Exercise"}
              height={220}
            />
          </View>

          {exerciseInfo ? (
            <Text style={styles.eyebrow}>
              {exerciseInfo.primaryMuscleGroup.replace("_", " ")} · {exerciseInfo.equipment}
            </Text>
          ) : null}
          <Text style={styles.exerciseName}>{exerciseInfo?.name ?? "Exercise"}</Text>
          {exerciseInfo?.formCues[0] ? <Text style={styles.formCue}>“{exerciseInfo.formCues[0]}”</Text> : null}

          <Pressable
            onPress={() => setIsEditingTarget((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Edit target for this exercise"
            style={styles.targetRow}
          >
            <Text style={styles.targetText}>
              Target: {activeExercise.targetRepRangeLow}-{activeExercise.targetRepRangeHigh}{" "}
              {exerciseInfo?.repUnit === "seconds" ? "sec" : "reps"}
              {activeExercise.targetRir !== undefined ? ` @ ${activeExercise.targetRir} RIR` : ""}
              {activeExercise.tempo ? ` · tempo ${activeExercise.tempo}` : ""} · edit
            </Text>
          </Pressable>

          {loadSuggestion?.suggestedWeight !== null && loadSuggestion ? (
            <Text style={styles.suggestionText}>
              Suggested: {loadSuggestion.suggestedWeight} kg — {loadSuggestion.reason}
            </Text>
          ) : null}

          {previous ? (
            <Text style={styles.previousSummary}>
              Last time: {previous.sets.length} sets · top {previous.topWeight}kg × {previous.topWeightReps} · vol{" "}
              {previous.totalVolume}
            </Text>
          ) : null}
        </Card>

        {isEditingTarget ? (
          <Card>
            <Stepper
              label="Rep Target — Low"
              value={activeExercise.targetRepRangeLow}
              min={1}
              max={50}
              onChange={(value) => updateExerciseTarget(activeExercise.id, { targetRepRangeLow: value })}
            />
            <Stepper
              label="Rep Target — High"
              value={activeExercise.targetRepRangeHigh}
              min={1}
              max={50}
              onChange={(value) => updateExerciseTarget(activeExercise.id, { targetRepRangeHigh: value })}
            />
            <Stepper
              label="Target RIR"
              value={activeExercise.targetRir ?? 0}
              min={0}
              max={10}
              onChange={(value) => updateExerciseTarget(activeExercise.id, { targetRir: value })}
            />
            <Stepper
              label="Rest"
              value={activeExercise.restSeconds ?? DEFAULT_REST_SECONDS}
              min={0}
              max={600}
              step={15}
              suffix="sec"
              onChange={(value) => updateExerciseTarget(activeExercise.id, { restSeconds: value })}
            />
          </Card>
        ) : null}

        <View style={styles.sets}>
          {activeExercise.sets.map((set) => {
            const prefill = prefillFor(previous, set.setNumber);
            const previousSet = previous?.sets.find((s) => s.order === set.setNumber);
            return (
              <SetRow
                key={set.id}
                setId={set.id}
                setNumber={set.setNumber}
                previousLabel={
                  previousSet
                    ? `${previousSet.weight} kg × ${previousSet.reps}${
                        previousSet.rir !== undefined ? ` · ${previousSet.rir} RIR` : ""
                      }`
                    : undefined
                }
                initialWeight={set.weight ?? prefill.weight}
                initialReps={set.reps ?? prefill.reps}
                initialRir={set.rir ?? prefill.rir}
                repUnit={exerciseInfo?.repUnit}
                completed={set.completed}
                isNext={set.id === nextSetId}
                onComplete={handleCompleteSet}
                onUncomplete={handleUncompleteSet}
                onRemove={activeExercise.sets.length > 1 ? handleRemoveSet : undefined}
              />
            );
          })}
        </View>

        <Button label="+ Add Set" variant="secondary" onPress={handleAddSet} />
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    muted: {
      color: theme.color.textSecondary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
    },
    topBarCenter: {
      alignItems: "center",
    },
    dayName: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "700",
      color: theme.color.textPrimary,
    },
    elapsed: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    discardLabel: {
      color: theme.color.textTertiary,
      fontWeight: "600",
    },
    finishLabel: {
      color: theme.color.accentText,
      fontWeight: "700",
    },
    progressTrack: {
      marginHorizontal: theme.spacing.lg,
      height: 4,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.color.surfaceElevated,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.color.accent,
    },
    progressLabel: {
      marginTop: 4,
      marginHorizontal: theme.spacing.lg,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
    },
    exerciseTabs: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    prBanner: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.color.accent,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    prBannerText: {
      color: theme.color.background,
      fontWeight: "700",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      textAlign: "center",
    },
    stickyTimer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    eyebrow: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.typeScale.eyebrow.fontSize,
      fontWeight: theme.typography.typeScale.eyebrow.fontWeight,
      letterSpacing: theme.typography.typeScale.eyebrow.letterSpacing,
      color: theme.color.accentText,
      textTransform: "uppercase",
    },
    exerciseName: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.textPrimary,
    },
    formCue: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.typeScale.body.fontSize,
      fontStyle: "italic",
      color: theme.color.textSecondary,
    },
    mediaSpacer: {
      marginBottom: theme.spacing.sm,
    },
    targetRow: {
      marginTop: theme.spacing.md,
    },
    targetText: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
    },
    previousSummary: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
    },
    suggestionText: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.color.accentText,
    },
    sets: {
      gap: theme.spacing.sm,
    },
  });
}
