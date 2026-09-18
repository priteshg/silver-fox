import type { Theme } from "@silver-fox/config";
import type { Equipment, MuscleGroup } from "@silver-fox/domain";
import { Button, useTheme } from "@silver-fox/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, ScreenContainer, TextField } from "../../../components";
import { useExerciseLibrary } from "../../../hooks/useExerciseLibrary";
import { filterExercises } from "../../../lib/exerciseFilters";

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

export default function ExercisesScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { exercises, refresh } = useExerciseLibrary();
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filtered = useMemo(
    () => filterExercises(exercises, { query, muscleGroup: muscleFilter, equipment: equipmentFilter }),
    [exercises, query, muscleFilter, equipmentFilter],
  );

  return (
    <ScreenContainer>
      <Button label="Create Custom Exercise" onPress={() => router.push("/exercises/new")} />

      <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Search exercises" />

      <View>
        <Text style={styles.filterLabel}>Muscle Group</Text>
        <View style={styles.chipRow}>
          <Chip label="All" selected={muscleFilter === null} onPress={() => setMuscleFilter(null)} />
          {MUSCLE_GROUPS.map((group) => (
            <Chip
              key={group}
              label={group.replace("_", " ")}
              selected={muscleFilter === group}
              onPress={() => setMuscleFilter(group)}
            />
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.filterLabel}>Equipment</Text>
        <View style={styles.chipRow}>
          <Chip label="All" selected={equipmentFilter === null} onPress={() => setEquipmentFilter(null)} />
          {EQUIPMENT_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={equipmentFilter === option}
              onPress={() => setEquipmentFilter(option)}
            />
          ))}
        </View>
      </View>

      <View style={styles.list} accessibilityLiveRegion="polite">
        <Text style={styles.resultCount}>
          {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
        </Text>
        {filtered.map((exercise) => (
          <Pressable key={exercise.id} style={styles.row} onPress={() => router.push(`/exercises/${exercise.id}`)}>
            <Text style={styles.title}>{exercise.name}</Text>
            <Text style={styles.subtitle}>
              {exercise.primaryMuscleGroup.replace("_", " ")} · {exercise.equipment}
              {exercise.isCustom ? " · custom" : ""}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    filterLabel: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: theme.typography.typeScale.caption.fontWeight,
      letterSpacing: theme.typography.typeScale.caption.letterSpacing,
      color: theme.color.textSecondary,
      textTransform: "uppercase",
      marginBottom: theme.spacing.xs,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    resultCount: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
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
  });
}
