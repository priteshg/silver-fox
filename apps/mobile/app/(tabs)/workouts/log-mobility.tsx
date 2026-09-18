import type { MobilityFocus } from "@silver-fox/domain";
import type { Theme } from "@silver-fox/config";
import { Button, Card, useTheme } from "@silver-fox/ui";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Chip, ScreenContainer, Stepper, TextField } from "../../../components";
import { useMobility } from "../../../hooks/useMobility";

const FOCUS_OPTIONS: { value: MobilityFocus; label: string }[] = [
  { value: "hips", label: "Hips" },
  { value: "thoracic_spine", label: "Thoracic Spine" },
  { value: "shoulders", label: "Shoulders" },
  { value: "ankles", label: "Ankles" },
  { value: "general", label: "General Recovery" },
];

export default function LogMobilityScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { log } = useMobility();
  const [focus, setFocus] = useState<MobilityFocus>("general");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    await log({
      focus,
      durationMinutes,
      date: new Date().toISOString(),
      notes: notes.trim() === "" ? undefined : notes.trim(),
    });
    router.back();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Log a Mobility Session</Text>
      <Text style={styles.subtitle}>A short session counts — this is about movement quality, not volume.</Text>

      <Card>
        <Text style={styles.label}>Focus</Text>
        <View style={styles.chipRow}>
          {FOCUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={focus === option.value}
              onPress={() => setFocus(option.value)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Stepper label="Duration" value={durationMinutes} min={5} max={90} step={5} suffix="min" onChange={setDurationMinutes} />
      </Card>

      <Card>
        <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="e.g. hips still tight on the left side" />
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
