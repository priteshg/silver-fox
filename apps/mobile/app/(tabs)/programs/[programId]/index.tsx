import type { Theme } from "@silver-fox/config";
import { estimateWorkoutDurationMinutes, type ProgramExercise, type StrengthFocus } from "@silver-fox/domain";
import { Button, Card, useTheme } from "@silver-fox/ui";
import type { ProgramId, WorkoutDayId } from "@silver-fox/types";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Chip, ReorderableRow, ScreenContainer, TextField } from "../../../../components";
import { useProgramDetail } from "../../../../hooks/useProgramDetail";
import { useProgramList } from "../../../../hooks/useProgramList";
import { buildSessionExercises, confirmAndStart } from "../../../../lib/startWorkout";
import { getCurrentUserIdSync } from "../../../../lib/supabase/auth";
import { useActiveSession } from "../../../../providers/ActiveSessionProvider";

const FOCUS_OPTIONS: { value: StrengthFocus; label: string }[] = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "legs", label: "Legs" },
  { value: "upper", label: "Upper" },
  { value: "lower", label: "Lower" },
  { value: "full_body", label: "Full Body" },
  { value: "other", label: "Other" },
];

const GOAL_LABELS: Record<string, string> = {
  build_muscle: "Build muscle",
  get_stronger: "Get stronger",
  strength_and_muscle: "Strength and muscle",
  recomposition: "Recomposition",
  fat_loss_maintain_muscle: "Fat loss, maintain muscle",
  general_fitness: "General fitness",
  longevity: "Longevity",
  return_to_training: "Return to training",
  busy_professional: "Busy professional",
};

export default function ProgramDetailScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { detail, isLoading, refresh, updateInfo, removeExercise, moveExercise, addDay, removeDay } =
    useProgramDetail(programId as ProgramId);
  const { selectedProgramId, selectProgram, refresh: refreshProgramList } = useProgramList();
  const { session, startSession } = useActiveSession();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [newDayName, setNewDayName] = useState("");
  const [newDayFocus, setNewDayFocus] = useState<StrengthFocus>("full_body");
  const [isSavingDay, setIsSavingDay] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function describeError(err: unknown): string {
    return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshProgramList();
    }, [refresh, refreshProgramList]),
  );

  if (isLoading || !detail) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>Loading…</Text>
      </ScreenContainer>
    );
  }

  const isActive = detail.program.id === selectedProgramId;
  const activeDayId = selectedDayId ?? detail.days[0]?.day.id ?? null;
  const activeDay = detail.days.find((d) => d.day.id === activeDayId) ?? detail.days[0];
  const activeDayDuration = activeDay
    ? estimateWorkoutDurationMinutes(
        activeDay.exercises.map((pe) => ({ targetSets: pe.targetSets, restSeconds: pe.restSeconds })),
      )
    : 0;

  function startEditing() {
    setName(detail!.program.name);
    setDescription(detail!.program.description ?? "");
    setIsEditing(true);
  }

  async function saveEditing() {
    setActionError(null);
    setIsSavingInfo(true);
    try {
      await updateInfo({ name: name.trim(), description: description.trim() || undefined });
      setIsEditing(false);
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setIsSavingInfo(false);
    }
  }

  function handleStartDay() {
    if (!activeDay) return;
    confirmAndStart({
      existingSession: session,
      onConfirmed: () => {
        startSession({
          userId: getCurrentUserIdSync(),
          programId: detail!.program.id,
          workoutDayId: activeDay.day.id,
          dayName: activeDay.day.name,
          exercises: buildSessionExercises(activeDay),
        });
        router.push("/workout/active");
      },
    });
  }

  function handleRemoveExercise(programExerciseId: ProgramExercise["id"], exerciseName: string) {
    Alert.alert("Remove exercise", `Remove "${exerciseName}" from ${activeDay?.day.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setActionError(null);
          removeExercise(programExerciseId).catch((err) => setActionError(describeError(err)));
        },
      },
    ]);
  }

  async function handleAddDay() {
    if (!newDayName.trim() || isSavingDay) return;
    setActionError(null);
    setIsSavingDay(true);
    try {
      await addDay({ name: newDayName.trim(), focus: newDayFocus });
      setNewDayName("");
      setNewDayFocus("full_body");
      setIsAddingDay(false);
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setIsSavingDay(false);
    }
  }

  function handleRemoveDay(dayId: WorkoutDayId, dayName: string) {
    if (detail!.days.length <= 1) {
      Alert.alert("Can't remove this day", "A programme needs at least one training day.");
      return;
    }
    Alert.alert("Remove day", `Remove "${dayName}" and every exercise in it? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setSelectedDayId(null);
          setActionError(null);
          removeDay(dayId).catch((err) => setActionError(describeError(err)));
        },
      },
    ]);
  }

  return (
    <ScreenContainer>
      {actionError ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
          <Text style={styles.errorBannerText}>{actionError}</Text>
        </View>
      ) : null}
      {isEditing ? (
        <Card elevated>
          <TextField label="Programme Name" value={name} onChangeText={setName} />
          <View style={styles.spacer} />
          <TextField label="Description" value={description} onChangeText={setDescription} multiline />
          <View style={styles.spacer} />
          <View style={styles.editActions}>
            <Button label="Cancel" variant="secondary" onPress={() => setIsEditing(false)} disabled={isSavingInfo} />
            <Button label={isSavingInfo ? "Saving…" : "Save"} onPress={saveEditing} disabled={isSavingInfo} />
          </View>
        </Card>
      ) : (
        <Card elevated>
          <View style={styles.nameRow}>
            <Text style={styles.programName}>{detail.program.name}</Text>
            {isActive ? (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeLabel}>Active</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.frequency}>
            {detail.program.daysPerWeek ?? detail.days.length} training days per week
            {detail.program.difficulty ? ` · ${detail.program.difficulty}` : ""}
          </Text>
          {detail.program.description ? <Text style={styles.programDescription}>{detail.program.description}</Text> : null}
          {detail.program.targetAudience ? (
            <Text style={styles.metaLine}>Who it&apos;s for: {detail.program.targetAudience}</Text>
          ) : null}
          {detail.program.primaryGoal ? (
            <Text style={styles.metaLine}>Goal: {GOAL_LABELS[detail.program.primaryGoal] ?? detail.program.primaryGoal}</Text>
          ) : null}
          {detail.program.philosophy ? <Text style={styles.philosophy}>“{detail.program.philosophy}”</Text> : null}
          <View style={styles.spacer} />
          <View style={styles.headerActions}>
            <Button label="Edit Details" variant="secondary" onPress={startEditing} />
            {!isActive ? (
              <Button
                label="Make My Programme"
                onPress={() => {
                  setActionError(null);
                  selectProgram(detail.program.id).catch((err) => setActionError(describeError(err)));
                }}
              />
            ) : null}
          </View>
        </Card>
      )}

      <View style={styles.rirCard}>
        <Text style={styles.rirTitle}>RIR — Reps In Reserve</Text>
        <Text style={styles.rirBody}>
          2 RIR means you finish a set feeling like you had around two more good reps left. This programme lives
          mostly around 1-3 RIR — hard, honest effort, without training to failure every set.
        </Text>
      </View>

      {detail.program.progressionMethod || detail.program.deloadStrategy ? (
        <View style={styles.rirCard}>
          {detail.program.progressionMethod ? (
            <>
              <Text style={styles.rirTitle}>Progression</Text>
              <Text style={styles.rirBody}>{detail.program.progressionMethod}</Text>
            </>
          ) : null}
          {detail.program.deloadStrategy ? (
            <>
              <Text style={[styles.rirTitle, styles.deloadTitle]}>Deload</Text>
              <Text style={styles.rirBody}>{detail.program.deloadStrategy}</Text>
            </>
          ) : null}
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
        {detail.days.map((d) => (
          <Chip
            key={d.day.id}
            label={d.day.name}
            selected={d.day.id === activeDay?.day.id}
            onPress={() => setSelectedDayId(d.day.id)}
          />
        ))}
        {detail.program.isCustom ? (
          <Chip label="+ Add Day" selected={false} onPress={() => setIsAddingDay((v) => !v)} />
        ) : null}
      </ScrollView>

      {isAddingDay ? (
        <Card>
          <TextField label="Day Name" value={newDayName} onChangeText={setNewDayName} placeholder="e.g. Upper Body" />
          <View style={styles.spacer} />
          <Text style={styles.focusLabel}>Focus</Text>
          <View style={styles.focusRow}>
            {FOCUS_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={newDayFocus === option.value}
                onPress={() => setNewDayFocus(option.value)}
              />
            ))}
          </View>
          <View style={styles.spacer} />
          <View style={styles.editActions}>
            <Button label="Cancel" variant="secondary" onPress={() => setIsAddingDay(false)} />
            <Button
              label={isSavingDay ? "Adding…" : "Add Day"}
              onPress={handleAddDay}
              disabled={!newDayName.trim() || isSavingDay}
            />
          </View>
        </Card>
      ) : null}

      {activeDay ? (
        <View style={styles.dayContent}>
          <View style={styles.dayHeader}>
            <View>
              <Text style={styles.dayTitle}>{activeDay.day.name}</Text>
              {activeDay.exercises.length > 0 ? (
                <Text style={styles.dayMeta}>
                  {activeDay.exercises.length} exercises · ~{activeDayDuration} min
                </Text>
              ) : null}
              {detail.program.isCustom ? (
                <Pressable
                  onPress={() => handleRemoveDay(activeDay.day.id, activeDay.day.name)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${activeDay.day.name}`}
                >
                  <Text style={styles.removeDayLabel}>Remove day</Text>
                </Pressable>
              ) : null}
            </View>
            <Button label="Start" onPress={handleStartDay} disabled={activeDay.exercises.length === 0} />
          </View>

          {activeDay.exercises.length === 0 ? (
            <Text style={styles.muted}>No exercises yet. Add one below.</Text>
          ) : (
            <View style={styles.list}>
              {activeDay.exercises.map((pe, index) => (
                <ReorderableRow
                  key={pe.id}
                  title={pe.exercise.name}
                  subtitle={`${pe.targetSets} × ${pe.targetRepRangeLow}-${pe.targetRepRangeHigh} ${
                    pe.exercise.repUnit === "seconds" ? "sec" : "reps"
                  }${pe.targetRir !== undefined ? ` @ RIR ${pe.targetRir}` : ""}${
                    pe.tempo ? ` · tempo ${pe.tempo}` : ""
                  }${pe.restSeconds ? ` · ${pe.restSeconds}s rest` : ""}`}
                  onPress={() => router.push(`/programs/${detail.program.id}/day/${activeDay.day.id}/exercise/${pe.id}`)}
                  onMoveUp={() => {
                    setActionError(null);
                    moveExercise(activeDay.day.id, index, index - 1).catch((err) => setActionError(describeError(err)));
                  }}
                  onMoveDown={() => {
                    setActionError(null);
                    moveExercise(activeDay.day.id, index, index + 1).catch((err) => setActionError(describeError(err)));
                  }}
                  canMoveUp={index > 0}
                  canMoveDown={index < activeDay.exercises.length - 1}
                  onRemove={() => handleRemoveExercise(pe.id, pe.exercise.name)}
                />
              ))}
            </View>
          )}

          <Button
            label="Add Exercise"
            variant="secondary"
            onPress={() => router.push(`/programs/${detail.program.id}/day/${activeDay.day.id}/add-exercise`)}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    muted: {
      color: theme.color.textSecondary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
    programName: {
      fontSize: theme.typography.typeScale.h2.fontSize,
      fontWeight: theme.typography.typeScale.h2.fontWeight,
      color: theme.color.textPrimary,
    },
    frequency: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.accentText,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    programDescription: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    activeBadge: {
      backgroundColor: theme.color.accent,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    activeBadgeLabel: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: "700",
      color: theme.color.background,
    },
    metaLine: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
    },
    philosophy: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontStyle: "italic",
      color: theme.color.textPrimary,
    },
    headerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    deloadTitle: {
      marginTop: theme.spacing.sm,
    },
    spacer: {
      height: theme.spacing.md,
    },
    rirCard: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      padding: theme.spacing.md,
      gap: 4,
    },
    rirTitle: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "700",
      color: theme.color.accentText,
    },
    rirBody: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      lineHeight: theme.typography.typeScale.caption.lineHeight,
      color: theme.color.textSecondary,
    },
    editActions: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    dayTabs: {
      gap: theme.spacing.sm,
    },
    dayContent: {
      gap: theme.spacing.md,
    },
    dayHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dayTitle: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
    },
    dayMeta: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textSecondary,
    },
    list: {
      gap: theme.spacing.sm,
    },
    focusLabel: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.color.textSecondary,
    },
    focusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    removeDayLabel: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: "600",
      color: theme.color.danger,
    },
    errorBanner: {
      borderRadius: theme.radius.md,
      backgroundColor: theme.color.danger,
      padding: theme.spacing.sm,
    },
    errorBannerText: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.background,
      textAlign: "center",
    },
  });
}
