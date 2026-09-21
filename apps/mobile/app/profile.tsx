import type { Theme } from "@silver-fox/config";
import type { Equipment, ProgrammeDifficulty, ProgrammeGoal } from "@silver-fox/domain";
import { Button, Card, useTheme } from "@silver-fox/ui";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Chip, ScreenContainer, Stepper, TextField } from "../components";
import { useUserProfile } from "../hooks/useUserProfile";
import { isAgeInRange, MAX_AGE, MIN_AGE } from "../lib/ageValidation";
import { useAuth } from "../providers/AuthProvider";

const EXPERIENCE_OPTIONS: ProgrammeDifficulty[] = ["beginner", "intermediate", "advanced"];

const GOAL_OPTIONS: ProgrammeGoal[] = [
  "build_muscle",
  "get_stronger",
  "strength_and_muscle",
  "recomposition",
  "fat_loss_maintain_muscle",
  "general_fitness",
  "longevity",
  "return_to_training",
  "busy_professional",
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

function label(value: string): string {
  return value.replace(/_/g, " ");
}

export default function ProfileScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile, isLoading, save } = useUserProfile();
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [experience, setExperience] = useState<ProgrammeDifficulty | undefined>(undefined);
  const [goals, setGoals] = useState<ProgrammeGoal[]>([]);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Profile loads asynchronously; seed the form once it arrives rather than
  // fighting it with a plain useState initializer (which would run before
  // the fetch resolves and never update).
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setAge(profile.age !== undefined ? String(profile.age) : "");
    setExperience(profile.trainingExperience);
    setGoals(profile.goals ?? []);
    setDaysPerWeek(profile.preferredTrainingDaysPerWeek ?? 3);
    setEquipment(profile.availableEquipment ?? []);
  }, [profile]);

  function toggleGoal(goal: ProgrammeGoal) {
    setGoals((current) => (current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal]));
  }

  function toggleEquipment(item: Equipment) {
    setEquipment((current) => (current.includes(item) ? current.filter((e) => e !== item) : [...current, item]));
  }

  async function handleSave() {
    setSaveError(null);
    // Age is filtered to digits-only as typed (see the field below), so a
    // parsed value is always a well-formed non-negative integer — but an
    // intermediate value like "1" while typing "18" is a legitimate typing
    // state, so the 13-120 range (the actual database constraint) is only
    // checked here, at save time, with a clear message — never silently
    // dropped the way an out-of-range age used to be.
    const parsedAge = age.trim() === "" ? undefined : Number(age);
    if (parsedAge !== undefined && !isAgeInRange(parsedAge)) {
      setSaveError(`Age must be between ${MIN_AGE} and ${MAX_AGE}.`);
      return;
    }
    setIsSaving(true);
    try {
      await save({
        displayName: displayName.trim() || undefined,
        age: parsedAge,
        trainingExperience: experience,
        goals: goals.length > 0 ? goals : undefined,
        preferredTrainingDaysPerWeek: daysPerWeek,
        availableEquipment: equipment.length > 0 ? equipment : undefined,
      });
      setSavedAt(Date.now());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      // No further action needed — AuthProvider's state change takes the
      // whole app back to the logged-out view automatically.
    } catch (err) {
      setSignOutError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>Loading…</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Your Profile</Text>
      <Text style={styles.subtitle}>
        This shapes how programmes are recommended to you later — none of it is required.
      </Text>

      <Card elevated>
        <TextField label="Name (optional)" value={displayName} onChangeText={setDisplayName} placeholder="How should we address you?" />
        <View style={styles.spacer} />
        <TextField
          label="Age (optional)"
          value={age}
          onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ""))}
          placeholder="e.g. 45"
          keyboardType="number-pad"
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Training Experience</Text>
        <View style={styles.chipRow}>
          {EXPERIENCE_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={label(option)}
              selected={experience === option}
              onPress={() => setExperience(option === experience ? undefined : option)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Goals</Text>
        <Text style={styles.sectionHint}>Pick as many as apply.</Text>
        <View style={styles.chipRow}>
          {GOAL_OPTIONS.map((option) => (
            <Chip key={option} label={label(option)} selected={goals.includes(option)} onPress={() => toggleGoal(option)} />
          ))}
        </View>
      </Card>

      <Card>
        <Stepper
          label="Preferred Training Days Per Week"
          value={daysPerWeek}
          min={1}
          max={7}
          onChange={setDaysPerWeek}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Available Equipment</Text>
        <Text style={styles.sectionHint}>Pick as many as apply.</Text>
        <View style={styles.chipRow}>
          {EQUIPMENT_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={label(option)}
              selected={equipment.includes(option)}
              onPress={() => toggleEquipment(option)}
            />
          ))}
        </View>
      </Card>

      <Button label={isSaving ? "Saving…" : "Save Profile"} onPress={handleSave} disabled={isSaving} />
      {savedAt ? <Text style={styles.savedLabel}>Saved.</Text> : null}
      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

      <View style={styles.spacer} />
      <Button
        label={isSigningOut ? "Signing out…" : "Sign Out"}
        onPress={handleSignOut}
        variant="secondary"
        disabled={isSigningOut}
      />
      {signOutError ? <Text style={styles.errorText}>{signOutError}</Text> : null}
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    muted: {
      color: theme.color.textSecondary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
    title: {
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.textPrimary,
    },
    subtitle: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
    },
    spacer: {
      height: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
    },
    sectionHint: {
      marginTop: 2,
      marginBottom: theme.spacing.sm,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    savedLabel: {
      textAlign: "center",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.success,
    },
    errorText: {
      marginTop: theme.spacing.xs,
      textAlign: "center",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.danger,
    },
  });
}
