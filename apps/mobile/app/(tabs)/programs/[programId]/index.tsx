import type { Theme } from "@silver-fox/config";
import { estimateWorkoutDurationMinutes, type ProgramExercise } from "@silver-fox/domain";
import { Button, Card, useTheme } from "@silver-fox/ui";
import type { ProgramId } from "@silver-fox/types";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Chip, ReorderableRow, ScreenContainer, TextField } from "../../../../components";
import { useProgramDetail } from "../../../../hooks/useProgramDetail";
import { useProgramList } from "../../../../hooks/useProgramList";
import { buildSessionExercises, confirmAndStart } from "../../../../lib/startWorkout";
import { LOCAL_USER_ID } from "../../../../data/currentUser";
import { useActiveSession } from "../../../../providers/ActiveSessionProvider";

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
  const { detail, isLoading, refresh, updateInfo, removeExercise, moveExercise } = useProgramDetail(
    programId as ProgramId,
  );
  const { selectedProgramId, selectProgram, refresh: refreshProgramList } = useProgramList();
  const { session, startSession } = useActiveSession();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
    await updateInfo({ name: name.trim(), description: description.trim() || undefined });
    setIsEditing(false);
  }

  function handleStartDay() {
    if (!activeDay) return;
    confirmAndStart({
      existingSession: session,
      onConfirmed: () => {
        startSession({
          userId: LOCAL_USER_ID,
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
      { text: "Remove", style: "destructive", onPress: () => void removeExercise(programExerciseId) },
    ]);
  }

  return (
    <ScreenContainer>
      {isEditing ? (
        <Card elevated>
          <TextField label="Programme Name" value={name} onChangeText={setName} />
          <View style={styles.spacer} />
          <TextField label="Description" value={description} onChangeText={setDescription} multiline />
          <View style={styles.spacer} />
          <View style={styles.editActions}>
            <Button label="Cancel" variant="secondary" onPress={() => setIsEditing(false)} />
            <Button label="Save" onPress={saveEditing} />
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
              <Button label="Make My Programme" onPress={() => void selectProgram(detail.program.id)} />
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
      </ScrollView>

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
                  onMoveUp={() => void moveExercise(activeDay.day.id, index, index - 1)}
                  onMoveDown={() => void moveExercise(activeDay.day.id, index, index + 1)}
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
  });
}
