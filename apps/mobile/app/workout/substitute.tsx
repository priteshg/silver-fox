import type { Theme } from "@silver-fox/config";
import { canSubstituteExercise, findSubstitutes, type CuratedSubstitution, type Equipment } from "@silver-fox/domain";
import { Button, Card, useTheme } from "@silver-fox/ui";
import type { ExerciseId } from "@silver-fox/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, ScreenContainer } from "../../components";
import { useExerciseLibrary } from "../../hooks/useExerciseLibrary";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useActiveSession } from "../../providers/ActiveSessionProvider";

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

/** All curated exercise_substitutions relationships, flattened from the already-loaded library — no separate fetch needed. */
function buildCuratedList(exercises: { id: string; substitutionExerciseIds?: string[] }[]): CuratedSubstitution[] {
  return exercises.flatMap((exercise) =>
    (exercise.substitutionExerciseIds ?? []).map((substituteExerciseId) => ({
      exerciseId: exercise.id,
      substituteExerciseId,
    })),
  );
}

export default function SubstituteExerciseScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { sessionExerciseId } = useLocalSearchParams<{ sessionExerciseId: string }>();
  const { session, substituteExercise, revertSubstitution } = useActiveSession();
  const { exercises } = useExerciseLibrary();
  const { profile } = useUserProfile();

  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);
  const [hasEditedEquipment, setHasEditedEquipment] = useState(false);

  const sessionExercise = session?.exercises.find((e) => e.id === sessionExerciseId);
  const originalExercise = exercises.find((e) => e.id === sessionExercise?.exerciseId);

  // Pre-fills from the profile once it loads, unless the person has already
  // started checking/unchecking boxes on this screen — a late-arriving
  // profile shouldn't clobber a choice they just made.
  useEffect(() => {
    if (hasEditedEquipment || !profile?.availableEquipment?.length) return;
    setSelectedEquipment(profile.availableEquipment);
  }, [profile, hasEditedEquipment]);

  function toggleEquipment(item: Equipment) {
    setHasEditedEquipment(true);
    setSelectedEquipment((current) => (current.includes(item) ? current.filter((e) => e !== item) : [...current, item]));
  }

  const candidates = useMemo(() => {
    if (!originalExercise) return [];
    return findSubstitutes({
      original: originalExercise,
      candidates: exercises,
      availableEquipment: selectedEquipment,
      curated: buildCuratedList(exercises),
    });
  }, [originalExercise, exercises, selectedEquipment]);

  if (!session || !sessionExercise || !originalExercise) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>This exercise is no longer part of your workout.</Text>
        <Button label="Back" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  if (!canSubstituteExercise(sessionExercise)) {
    return (
      <ScreenContainer>
        <Text style={styles.title}>Replace {originalExercise.name}</Text>
        <Text style={styles.muted}>
          You&apos;ve already logged a set for this exercise today, so it can&apos;t be substituted now.
        </Text>
        <Button label="Back" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  function handleUse(newExerciseId: ExerciseId) {
    substituteExercise(sessionExercise!.id, newExerciseId);
    router.back();
  }

  function handleRevert() {
    revertSubstitution(sessionExercise!.id);
    router.back();
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Replace {originalExercise.name}</Text>

      <View>
        <Text style={styles.label}>Available Equipment</Text>
        <View style={styles.chipRow}>
          {EQUIPMENT_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={selectedEquipment.includes(option)}
              onPress={() => toggleEquipment(option)}
            />
          ))}
        </View>
      </View>

      <View style={styles.list}>
        <Text style={styles.label}>Suggested Alternatives</Text>
        {candidates.length === 0 ? (
          <Text style={styles.muted}>No suitable alternative was found for the equipment you have.</Text>
        ) : (
          candidates.map((candidate) => (
            <Card key={candidate.exercise.id}>
              <Text style={styles.candidateName}>{candidate.exercise.name}</Text>
              <Text style={styles.candidateReason}>{candidate.reason}</Text>
              <Button
                label="Use This"
                variant="secondary"
                accessibilityLabel={`Use ${candidate.exercise.name}`}
                onPress={() => handleUse(candidate.exercise.id)}
              />
            </Card>
          ))
        )}
      </View>

      <Pressable
        onPress={() => router.push(`/exercises`)}
        accessibilityRole="button"
      >
        <Text style={styles.browseLink}>No matches? Browse the full exercise library →</Text>
      </Pressable>

      {sessionExercise.originalExerciseId ? (
        <Button label="Revert to Original Exercise" variant="secondary" onPress={handleRevert} />
      ) : null}
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    title: {
      fontSize: theme.typography.typeScale.h2.fontSize,
      fontWeight: theme.typography.typeScale.h2.fontWeight,
      color: theme.color.textPrimary,
    },
    muted: {
      color: theme.color.textSecondary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
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
    list: {
      gap: theme.spacing.sm,
    },
    candidateName: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "700",
      color: theme.color.textPrimary,
    },
    candidateReason: {
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
    },
    browseLink: {
      color: theme.color.accentText,
      fontWeight: "600",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      textAlign: "center",
    },
  });
}
