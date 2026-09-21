import type { Theme } from "@silver-fox/config";
import type { ProgramExercise } from "@silver-fox/domain";
import { Button, Card, useTheme } from "@silver-fox/ui";
import type { ProgramId, WorkoutDayId } from "@silver-fox/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { ScreenContainer, Stepper } from "../../../../../../../components";
import { useExerciseLibrary } from "../../../../../../../hooks/useExerciseLibrary";
import { useProgramDetail } from "../../../../../../../hooks/useProgramDetail";

export default function ConfigureProgramExerciseScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams<{
    programId: string;
    dayId: string;
    programExerciseId: string;
    exerciseId?: string;
  }>();
  const isNew = params.programExerciseId === "new";
  const { detail, addExercise, updateExercise, removeExercise } = useProgramDetail(params.programId as ProgramId);
  const { exercises } = useExerciseLibrary();

  const existing = !isNew
    ? detail?.days.flatMap((d) => d.exercises).find((pe) => pe.id === params.programExerciseId)
    : undefined;
  const libraryExercise = isNew ? exercises.find((exercise) => exercise.id === params.exerciseId) : undefined;
  const exerciseName = isNew ? libraryExercise?.name : existing?.exercise.name;

  const [targetSets, setTargetSets] = useState(3);
  const [targetRepRangeLow, setTargetRepRangeLow] = useState(8);
  const [targetRepRangeHigh, setTargetRepRangeHigh] = useState(12);
  const [targetRir, setTargetRir] = useState(2);
  const [restSeconds, setRestSeconds] = useState(90);
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function describeError(err: unknown): string {
    return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }

  useEffect(() => {
    if (initialized) return;
    if (existing) {
      setTargetSets(existing.targetSets);
      setTargetRepRangeLow(existing.targetRepRangeLow);
      setTargetRepRangeHigh(existing.targetRepRangeHigh);
      setTargetRir(existing.targetRir ?? 0);
      setRestSeconds(existing.restSeconds ?? 90);
      setInitialized(true);
    } else if (isNew && libraryExercise) {
      setRestSeconds(libraryExercise.recommendedRestSeconds ?? 90);
      setInitialized(true);
    }
  }, [existing, isNew, libraryExercise, initialized]);

  // A rep range where the low end exceeds the high end is never a valid
  // target (enforced at the database level too — program_exercises'
  // rep-range-ordered check). Previously this was silently corrected only
  // at save time (raising a too-low "high" to match "low" with no
  // explanation), which could show a person a nonsensical range like
  // "10-8" right up until they saved. Coupling the two steppers keeps the
  // displayed value always valid, with no silent surprise at save time.
  function handleLowChange(value: number) {
    setTargetRepRangeLow(value);
    if (value > targetRepRangeHigh) setTargetRepRangeHigh(value);
  }

  function handleHighChange(value: number) {
    setTargetRepRangeHigh(value);
    if (value < targetRepRangeLow) setTargetRepRangeLow(value);
  }

  async function handleSave() {
    if (isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      if (isNew) {
        if (!params.exerciseId) return;
        await addExercise(params.dayId as WorkoutDayId, {
          exerciseId: params.exerciseId as ProgramExercise["exerciseId"],
          targetSets,
          targetRepRangeLow,
          targetRepRangeHigh,
          targetRir,
          restSeconds,
        });
      } else if (existing) {
        await updateExercise(existing.id, {
          targetSets,
          targetRepRangeLow,
          targetRepRangeHigh,
          targetRir,
          restSeconds,
        });
      }
      router.dismissTo(`/programs/${params.programId}`);
    } catch (err) {
      setSaveError(describeError(err));
      setIsSaving(false);
    }
  }

  function handleRemove() {
    if (!existing) return;
    Alert.alert("Remove exercise", `Remove "${exerciseName}" from this day?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setSaveError(null);
          try {
            await removeExercise(existing.id);
            router.dismissTo(`/programs/${params.programId}`);
          } catch (err) {
            setSaveError(describeError(err));
          }
        },
      },
    ]);
  }

  return (
    <ScreenContainer>
      <Card elevated>
        <Text style={styles.exerciseName}>{exerciseName ?? "Exercise"}</Text>
      </Card>

      <Stepper label="Target Sets" value={targetSets} min={1} max={10} onChange={setTargetSets} />
      <Stepper label="Target Reps — Low" value={targetRepRangeLow} min={1} max={50} onChange={handleLowChange} />
      <Stepper
        label="Target Reps — High"
        value={targetRepRangeHigh}
        min={1}
        max={50}
        onChange={handleHighChange}
      />
      <Stepper label="Target RIR" value={targetRir} min={0} max={10} onChange={setTargetRir} />
      <Stepper
        label="Rest Between Sets"
        value={restSeconds}
        min={0}
        max={600}
        step={15}
        onChange={setRestSeconds}
        suffix="sec"
      />

      <Button
        label={isSaving ? "Saving…" : isNew ? "Add to Day" : "Save Changes"}
        onPress={handleSave}
        disabled={isSaving}
      />
      {!isNew ? <Button label="Remove From Day" variant="secondary" onPress={handleRemove} disabled={isSaving} /> : null}
      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    exerciseName: {
      fontSize: theme.typography.typeScale.h2.fontSize,
      fontWeight: theme.typography.typeScale.h2.fontWeight,
      color: theme.color.textPrimary,
    },
    errorText: {
      marginTop: theme.spacing.xs,
      textAlign: "center",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.danger,
    },
  });
}
