import type { ConditioningType } from "@silver-fox/domain";
import type { Theme } from "@silver-fox/config";
import { Button, Card, useTheme } from "@silver-fox/ui";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Chip, ScreenContainer, Stepper, TextField } from "../../../components";
import { useConditioning } from "../../../hooks/useConditioning";

const TYPE_OPTIONS: { value: ConditioningType; label: string }[] = [
  { value: "zone2", label: "Zone 2" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "walking", label: "Walking" },
  { value: "intervals", label: "Intervals" },
  { value: "other", label: "Other" },
];

export default function LogCardioScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { log } = useConditioning();
  const [type, setType] = useState<ConditioningType>("zone2");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    await log({
      type,
      durationMinutes,
      date: new Date().toISOString(),
      notes: notes.trim() === "" ? undefined : notes.trim(),
    });
    router.back();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Log a Cardio Session</Text>
      <Text style={styles.subtitle}>Keep a simple record — type and duration are enough.</Text>

      <Card>
        <Text style={styles.label}>Type</Text>
        <View style={styles.chipRow}>
          {TYPE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={type === option.value}
              onPress={() => setType(option.value)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Stepper label="Duration" value={durationMinutes} min={5} max={240} step={5} suffix="min" onChange={setDurationMinutes} />
      </Card>

      <Card>
        <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="e.g. felt easy, kept HR under 130" />
      </Card>

      <Button label="Save Session" onPress={handleSave} disabled={isSaving} />
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
    subtitle: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    label: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: theme.typography.typeScale.caption.fontWeight,
      letterSpacing: theme.typography.typeScale.caption.letterSpacing,
      color: theme.color.textSecondary,
      textTransform: "uppercase",
      marginBottom: theme.spacing.sm,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
  });
}
