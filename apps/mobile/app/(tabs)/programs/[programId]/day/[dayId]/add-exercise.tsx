import type { Theme } from "@silver-fox/config";
import type { Equipment, MuscleGroup } from "@silver-fox/domain";
import { useTheme } from "@silver-fox/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, ScreenContainer, TextField } from "../../../../../../components";
import { useExerciseLibrary } from "../../../../../../hooks/useExerciseLibrary";
import { filterExercises } from "../../../../../../lib/exerciseFilters";

const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "core",
  "full_body",
];

const EQUIPMENT_OPTIONS: Equipment[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
];

export default function AddExerciseScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { programId, dayId } = useLocalSearchParams<{ programId: string; dayId: string }>();
  const { exercises } = useExerciseLibrary();
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | null>(null);

  const filtered = useMemo(
    () => filterExercises(exercises, { query, muscleGroup: muscleFilter, equipment: equipmentFilter }),
    [exercises, query, muscleFilter, equipmentFilter],
  );

  function selectExercise(exerciseId: string) {
    router.push(`/programs/${programId}/day/${dayId}/exercise/new?exerciseId=${exerciseId}`);
  }

  return (
    <ScreenContainer>
      <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Search exercises" />

      <View style={styles.chipRow}>
        <Chip label="All Muscles" selected={muscleFilter === null} onPress={() => setMuscleFilter(null)} />
        {MUSCLE_GROUPS.map((group) => (
          <Chip
            key={group}
            label={group.replace("_", " ")}
            selected={muscleFilter === group}
            onPress={() => setMuscleFilter(group)}
          />
        ))}
      </View>

      <View style={styles.chipRow}>
        <Chip label="All Equipment" selected={equipmentFilter === null} onPress={() => setEquipmentFilter(null)} />
        {EQUIPMENT_OPTIONS.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={equipmentFilter === option}
            onPress={() => setEquipmentFilter(option)}
          />
        ))}
      </View>

      <View style={styles.list}>
        {filtered.map((exercise) => (
          <Pressable key={exercise.id} style={styles.row} onPress={() => selectExercise(exercise.id)}>
            <Text style={styles.title}>{exercise.name}</Text>
            <Text style={styles.subtitle}>
              {exercise.primaryMuscleGroup.replace("_", " ")} · {exercise.equipment}
            </Text>
          </Pressable>
        ))}
        {filtered.length === 0 ? <Text style={styles.muted}>No exercises match.</Text> : null}
      </View>

      <Pressable onPress={() => router.push("/exercises/new")} accessibilityRole="button">
        <Text style={styles.createLink}>Can&apos;t find it? Create a custom exercise →</Text>
      </Pressable>
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    list: {
      gap: theme.spacing.sm,
    },
    row: {
      minHeight: theme.touchTarget.comfortable,
      justifyContent: "center",
      backgroundColor: theme.color.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "600",
      color: theme.color.textPrimary,
    },
    subtitle: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
      textTransform: "capitalize",
    },
    muted: {
      color: theme.color.textSecondary,
    },
    createLink: {
      color: theme.color.accentText,
      fontWeight: "600",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      textAlign: "center",
    },
  });
}
