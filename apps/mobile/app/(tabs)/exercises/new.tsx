import type { Theme } from "@silver-fox/config";
import type { Equipment, MuscleGroup } from "@silver-fox/domain";
import { Button, useTheme } from "@silver-fox/ui";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, ScreenContainer, TextField } from "../../../components";
import { useExerciseLibrary } from "../../../hooks/useExerciseLibrary";

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

export default function NewExerciseScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { addExercise } = useExerciseLibrary();
  const [name, setName] = useState("");
  const [primaryMuscleGroup, setPrimaryMuscleGroup] = useState<MuscleGroup>("chest");
  const [secondaryMuscleGroups, setSecondaryMuscleGroups] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment>("barbell");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [isSaving, setIsSaving] = useState(false);

  function toggleSecondary(group: MuscleGroup) {
    setSecondaryMuscleGroups((current) =>
      current.includes(group) ? current.filter((g) => g !== group) : [...current, group],
    );
  }

  function updateInstruction(index: number, value: string) {
    setInstructions((current) => current.map((step, i) => (i === index ? value : step)));
  }

  const canSave = name.trim().length > 0;

  async function handleSave() {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    try {
      const exercise = await addExercise({
        name: name.trim(),
        primaryMuscleGroup,
        secondaryMuscleGroups,
        equipment,
        description: description.trim(),
        instructions: instructions.map((step) => step.trim()).filter((step) => step.length > 0),
        formCues: [],
        commonMistakes: [],
      });
      router.replace(`/exercises/${exercise.id}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <TextField label="Exercise Name" value={name} onChangeText={setName} placeholder="e.g. Cable Fly" />

      <View>
        <Text style={styles.label}>Primary Muscle Group</Text>
        <View style={styles.chipRow}>
          {MUSCLE_GROUPS.map((group) => (
            <Chip
              key={group}
              label={group.replace("_", " ")}
              selected={primaryMuscleGroup === group}
              onPress={() => setPrimaryMuscleGroup(group)}
            />
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.label}>Secondary Muscle Groups</Text>
        <View style={styles.chipRow}>
          {MUSCLE_GROUPS.filter((group) => group !== primaryMuscleGroup).map((group) => (
            <Chip
              key={group}
              label={group.replace("_", " ")}
              selected={secondaryMuscleGroups.includes(group)}
              onPress={() => toggleSecondary(group)}
            />
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.label}>Equipment</Text>
        <View style={styles.chipRow}>
          {EQUIPMENT_OPTIONS.map((option) => (
            <Chip key={option} label={option} selected={equipment === option} onPress={() => setEquipment(option)} />
          ))}
        </View>
      </View>

      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="What does this exercise train?"
        multiline
      />

      <View>
        <Text style={styles.label}>Instructions</Text>
        {instructions.map((step, index) => (
          <View key={index} style={styles.instructionRow}>
            <TextField
              label={`Step ${index + 1}`}
              value={step}
              onChangeText={(value) => updateInstruction(index, value)}
            />
          </View>
        ))}
        <Pressable onPress={() => setInstructions((current) => [...current, ""])}>
          <Text style={styles.addStepLink}>+ Add Step</Text>
        </Pressable>
      </View>

      <Button label={isSaving ? "Saving…" : "Save Exercise"} onPress={handleSave} disabled={!canSave || isSaving} />
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    label: {
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
    instructionRow: {
      marginBottom: theme.spacing.sm,
    },
    addStepLink: {
      color: theme.color.accentText,
      fontWeight: "600",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
    },
  });
}
