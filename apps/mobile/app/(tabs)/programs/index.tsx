import type { Theme } from "@silver-fox/config";
import type { Program, ProgrammeCategory } from "@silver-fox/domain";
import { EmptyState, useTheme } from "@silver-fox/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Chip, ScreenContainer } from "../../../components";
import { useProgramList } from "../../../hooks/useProgramList";

const CATEGORY_OPTIONS: { value: ProgrammeCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "full_body", label: "Full Body" },
  { value: "upper_lower", label: "Upper/Lower" },
  { value: "push_pull_legs", label: "Push/Pull/Legs" },
  { value: "hybrid", label: "Hybrid" },
];

const CATEGORY_LABELS: Record<ProgrammeCategory, string> = {
  full_body: "Full Body",
  upper_lower: "Upper/Lower",
  push_pull_legs: "Push/Pull/Legs",
  hybrid: "Hybrid",
};

export default function ProgramsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { programs, selectedProgramId, isLoading, refresh, remove, selectProgram } = useProgramList();
  const [categoryFilter, setCategoryFilter] = useState<ProgrammeCategory | "all">("all");

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filtered = useMemo(
    () => programs.filter((program) => categoryFilter === "all" || program.category === categoryFilter),
    [programs, categoryFilter],
  );

  function confirmDelete(programId: Program["id"], name: string) {
    Alert.alert("Delete programme", `Delete "${name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void remove(programId) },
    ]);
  }

  return (
    <ScreenContainer>
      <View>
        <Text style={styles.title}>Programme Library</Text>
        <Text style={styles.subtitle}>{programs.length} programmes across full body, upper/lower, push/pull/legs and hybrid training.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {CATEGORY_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={categoryFilter === option.value}
            onPress={() => setCategoryFilter(option.value)}
          />
        ))}
      </ScrollView>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState title="No programmes match" description="Try a different category filter." />
      ) : (
        <View style={styles.list}>
          {filtered.map((program) => {
            const isActive = program.id === selectedProgramId;
            return (
              <View key={program.id} style={[styles.card, isActive && styles.cardActive]}>
                <Pressable
                  onPress={() => router.push(`/programs/${program.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${program.name}${isActive ? ", your active programme" : ""}`}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.programName}>{program.name}</Text>
                    {isActive ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeLabel}>Active</Text>
                      </View>
                    ) : null}
                  </View>
                  {program.description ? <Text style={styles.programDescription}>{program.description}</Text> : null}
                  <Text style={styles.programMeta}>
                    {program.category ? CATEGORY_LABELS[program.category] : "Custom"}
                    {program.daysPerWeek ? ` · ${program.daysPerWeek}x/week` : ""}
                    {program.estimatedSessionMinutesLow ? ` · ${program.estimatedSessionMinutesLow}-${program.estimatedSessionMinutesHigh} min` : ""}
                    {program.difficulty ? ` · ${program.difficulty}` : ""}
                  </Text>
                </Pressable>
                {!isActive ? (
                  <Pressable
                    onPress={() => void selectProgram(program.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Make ${program.name} your active programme`}
                    style={styles.selectLink}
                  >
                    <Text style={styles.selectLinkLabel}>Make this my programme</Text>
                  </Pressable>
                ) : null}
                {program.isCustom ? (
                  <Pressable
                    onPress={() => confirmDelete(program.id, program.name)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${program.name}`}
                    style={styles.deleteLink}
                  >
                    <Text style={styles.deleteLinkLabel}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <Pressable onPress={() => router.push("/programs/new")} accessibilityRole="button">
        <Text style={styles.newProgrammeLink}>+ Create a custom programme</Text>
      </Pressable>
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
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
    },
    filterRow: {
      gap: theme.spacing.sm,
    },
    list: {
      gap: theme.spacing.sm,
    },
    card: {
      backgroundColor: theme.color.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.color.border,
      padding: theme.spacing.md,
      gap: 4,
    },
    cardActive: {
      borderColor: theme.color.accent,
      borderWidth: 2,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    programName: {
      flex: 1,
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
    },
    activeBadge: {
      backgroundColor: theme.color.accent,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    activeBadgeLabel: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: "700",
      color: theme.color.background,
    },
    programDescription: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
    },
    programMeta: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
      textTransform: "capitalize",
    },
    selectLink: {
      marginTop: theme.spacing.xs,
      alignSelf: "flex-start",
    },
    selectLinkLabel: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.color.accentText,
    },
    deleteLink: {
      marginTop: theme.spacing.xs,
      alignSelf: "flex-start",
    },
    deleteLinkLabel: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: "600",
      color: theme.color.danger,
    },
    newProgrammeLink: {
      textAlign: "center",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.color.textSecondary,
    },
  });
}
