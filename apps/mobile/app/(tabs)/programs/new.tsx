import type { Theme } from "@silver-fox/config";
import { Button, useTheme } from "@silver-fox/ui";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ScreenContainer, Stepper, TextField } from "../../../components";
import { useProgramList } from "../../../hooks/useProgramList";

const DEFAULT_DAY_NAMES = ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body"];

export default function NewProgramScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { create } = useProgramList();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [dayNames, setDayNames] = useState<string[]>(["Push", "Pull", "Legs"]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const NAME_MAX_LENGTH = 80; // matches the programs.name CHECK constraint (supabase/migrations/20260918213639_programs.sql)

  function updateDaysPerWeek(count: number) {
    setDaysPerWeek(count);
    setDayNames((current) => {
      const next = current.slice(0, count);
      while (next.length < count) {
        next.push(DEFAULT_DAY_NAMES[next.length] ?? `Day ${next.length + 1}`);
      }
      return next;
    });
  }

  function updateDayName(index: number, value: string) {
    setDayNames((current) => current.map((day, i) => (i === index ? value : day)));
  }

  const canSave = name.trim().length > 0 && dayNames.every((day) => day.trim().length > 0);

  async function handleSave() {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const program = await create({
        name: name.trim(),
        description: description.trim() || undefined,
        dayNames: dayNames.map((day) => day.trim()),
      });
      router.replace(`/programs/${program.id}`);
    } catch {
      // The DB's CHECK constraints (name length, etc.) are the source of
      // truth; client-side maxLength below prevents the common case, but
      // this catches anything else the server rejects so it's never silent.
      setError(`Couldn't save this programme — check the name is ${NAME_MAX_LENGTH} characters or fewer.`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <TextField
        label="Programme Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Push Pull Legs"
        maxLength={NAME_MAX_LENGTH}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="What is this programme for?"
        multiline
      />
      <Stepper label="Training Days Per Week" value={daysPerWeek} min={1} max={6} onChange={updateDaysPerWeek} />

      <Text style={styles.sectionTitle}>Name Your Training Days</Text>
      {dayNames.map((dayName, index) => (
        <TextField
          key={index}
          label={`Day ${index + 1}`}
          value={dayName}
          onChangeText={(value) => updateDayName(index, value)}
        />
      ))}

      <Button label={isSaving ? "Creating…" : "Create Programme"} onPress={handleSave} disabled={!canSave || isSaving} />
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
      marginTop: theme.spacing.sm,
    },
    errorText: {
      color: theme.color.danger,
      fontSize: theme.typography.typeScale.caption.fontSize,
    },
  });
}
