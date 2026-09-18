import type { Theme } from "@silver-fox/config";
import { calculateCurrentRecords } from "@silver-fox/domain";
import { Card, StatNumber, useTheme } from "@silver-fox/ui";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ExerciseMediaView, MiniBarChart, ScreenContainer } from "../../../components";
import { useExerciseLibrary } from "../../../hooks/useExerciseLibrary";
import { useWorkoutHistory } from "../../../hooks/useWorkoutHistory";

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { exercises } = useExerciseLibrary();
  const { historyByExercise, previousPerformance, sets, isLoading } = useWorkoutHistory();

  const exercise = exercises.find((e) => e.id === exerciseId);
  if (!exercise) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>Loading…</Text>
      </ScreenContainer>
    );
  }

  const history = historyByExercise(exercise.id).slice(0, 8).reverse();
  const previous = previousPerformance(exercise.id);
  const currentRecords = calculateCurrentRecords(sets.filter((s) => s.exerciseId === exercise.id));

  const hasStructuredContent = !!exercise.setup || !!exercise.execution;

  return (
    <ScreenContainer>
      <ExerciseMediaView media={exercise.media} exerciseName={exercise.name} height={220} />

      <View>
        <View style={styles.tagRow}>
          {exercise.movementPattern ? (
            <View style={styles.tag}>
              <Text style={styles.tagLabel}>{exercise.movementPattern}</Text>
            </View>
          ) : null}
          {exercise.difficulty ? (
            <View style={styles.tag}>
              <Text style={styles.tagLabel}>{exercise.difficulty}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.meta}>
          {exercise.primaryMuscleGroup.replace("_", " ")}
          {exercise.secondaryMuscleGroups.length > 0
            ? ` + ${exercise.secondaryMuscleGroups.map((g) => g.replace("_", " ")).join(", ")}`
            : ""}
          {" · "}
          {exercise.equipment}
        </Text>
        {exercise.why ? <Text style={styles.why}>“{exercise.why}”</Text> : null}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.body}>{exercise.description}</Text>
      </Card>

      {hasStructuredContent ? (
        <Card>
          {exercise.setup ? (
            <View style={styles.contentBlock}>
              <Text style={styles.contentLabel}>Setup</Text>
              <Text style={styles.body}>{exercise.setup}</Text>
            </View>
          ) : null}
          {exercise.execution ? (
            <View style={styles.contentBlock}>
              <Text style={styles.contentLabel}>Execution</Text>
              <Text style={styles.body}>{exercise.execution}</Text>
            </View>
          ) : null}
          {exercise.breathingCue ? (
            <View style={styles.contentBlock}>
              <Text style={styles.contentLabel}>Breathing</Text>
              <Text style={styles.body}>{exercise.breathingCue}</Text>
            </View>
          ) : null}
        </Card>
      ) : exercise.instructions.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>How To</Text>
          {exercise.instructions.map((step, index) => (
            <Text key={index} style={styles.instruction}>
              {index + 1}. {step}
            </Text>
          ))}
        </Card>
      ) : null}

      {exercise.formCues.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Form Cues</Text>
          {exercise.formCues.map((cue, index) => (
            <Text key={index} style={styles.bullet}>
              • {cue}
            </Text>
          ))}
        </Card>
      ) : null}

      {exercise.commonMistakes.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Common Mistakes</Text>
          {exercise.commonMistakes.map((mistake, index) => (
            <Text key={index} style={styles.bullet}>
              • {mistake}
            </Text>
          ))}
        </Card>
      ) : null}

      {exercise.progressionGuidance || exercise.regressionOrSubstitution ? (
        <Card>
          {exercise.progressionGuidance ? (
            <View style={styles.contentBlock}>
              <Text style={styles.contentLabel}>Progression</Text>
              <Text style={styles.body}>{exercise.progressionGuidance}</Text>
            </View>
          ) : null}
          {exercise.regressionOrSubstitution ? (
            <View>
              <Text style={styles.contentLabel}>Substitution</Text>
              <Text style={styles.body}>{exercise.regressionOrSubstitution}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {exercise.recommendedRestSeconds ? (
        <Card>
          <Text style={styles.sectionTitle}>Recommended Rest</Text>
          <Text style={styles.body}>
            {exercise.recommendedRestSeconds} seconds between sets{exercise.repUnit === "seconds" ? " · target measured in a timed hold" : ""}
          </Text>
        </Card>
      ) : null}

      {currentRecords ? (
        <Card elevated>
          <Text style={styles.sectionTitle}>Personal Records</Text>
          <View style={styles.previousRow}>
            <StatNumber value={`${currentRecords.heaviestWeight} kg`} label="Heaviest Weight" />
            <StatNumber value={`${currentRecords.bestEstimatedOneRepMax} kg`} label="Best Est. 1RM" />
            <StatNumber value={currentRecords.bestSessionVolume} label="Best Session Volume" />
          </View>
        </Card>
      ) : null}

      <Card elevated>
        <Text style={styles.sectionTitle}>Progression</Text>
        {isLoading ? (
          <Text style={styles.muted}>Loading history…</Text>
        ) : history.length === 0 ? (
          <Text style={styles.muted}>No logged sets yet. Progress will appear after your first workout.</Text>
        ) : (
          <>
            {previous ? (
              <View style={styles.previousRow}>
                <StatNumber value={`${previous.topWeight} kg`} label="Last Top Set" />
                <StatNumber value={previous.estimatedOneRepMax || "—"} label="Est. 1RM (kg)" />
                <StatNumber value={previous.totalVolume} label="Last Volume" />
              </View>
            ) : null}

            <View style={styles.spacer} />
            <Text style={styles.chartLabel}>Top weight per session (kg)</Text>
            <MiniBarChart
              values={history.map((h) => h.topWeight)}
              formatValue={(v) => String(v)}
              accessibilityLabel={`Top weight per session in kilograms: ${history.map((h) => h.topWeight).join(", ")}`}
            />

            <View style={styles.spacer} />
            <Text style={styles.chartLabel}>Reps at top weight</Text>
            <MiniBarChart
              values={history.map((h) => h.topWeightReps)}
              formatValue={(v) => String(v)}
              accessibilityLabel={`Reps at top weight per session: ${history.map((h) => h.topWeightReps).join(", ")}`}
            />

            <View style={styles.spacer} />
            <Text style={styles.chartLabel}>Volume per session</Text>
            <MiniBarChart
              values={history.map((h) => h.totalVolume)}
              formatValue={(v) => String(v)}
              accessibilityLabel={`Training volume per session: ${history.map((h) => h.totalVolume).join(", ")}`}
            />

            <View style={styles.spacer} />
            <Text style={styles.chartLabel}>Estimated 1RM per session (kg)</Text>
            <MiniBarChart
              values={history.map((h) => h.estimatedOneRepMax)}
              formatValue={(v) => String(v)}
              accessibilityLabel={`Estimated one rep max per session in kilograms: ${history
                .map((h) => h.estimatedOneRepMax)
                .join(", ")}`}
            />
          </>
        )}
      </Card>
    </ScreenContainer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    muted: {
      color: theme.color.textSecondary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    tag: {
      backgroundColor: theme.color.surfaceElevated,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    tagLabel: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: "600",
      color: theme.color.textSecondary,
      textTransform: "capitalize",
    },
    name: {
      fontSize: theme.typography.typeScale.h1.fontSize,
      fontWeight: theme.typography.typeScale.h1.fontWeight,
      color: theme.color.textPrimary,
    },
    meta: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
      textTransform: "capitalize",
    },
    why: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.typeScale.body.fontSize,
      fontStyle: "italic",
      color: theme.color.textPrimary,
    },
    contentBlock: {
      marginBottom: theme.spacing.md,
    },
    contentLabel: {
      fontSize: theme.typography.typeScale.eyebrow.fontSize,
      fontWeight: theme.typography.typeScale.eyebrow.fontWeight,
      letterSpacing: theme.typography.typeScale.eyebrow.letterSpacing,
      color: theme.color.accentText,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    body: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
    },
    instruction: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    bullet: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    previousRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    spacer: {
      height: theme.spacing.md,
    },
    chartLabel: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
    },
  });
}
