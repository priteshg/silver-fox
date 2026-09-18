import type { Theme } from "@silver-fox/config";
import type { TrainingCategory, WeekDayOverview } from "@silver-fox/domain";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const CATEGORY_LABELS: Record<TrainingCategory, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
  strength: "Training",
  cardio: "Cardio",
  recovery: "Recovery",
  rest: "Rest",
};

// Deliberately short forms for the narrow day pill — not a naive character
// slice, which mangles words like "Cardio" or "Recovery" into "Card"/"Reco".
const PILL_LABELS: Record<TrainingCategory, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
  strength: "Train",
  cardio: "Cardio",
  recovery: "Mobil.",
  rest: "Rest",
};

function summaryFor(day: WeekDayOverview): string {
  if (day.isFuture) return "Not yet scheduled";
  return day.category ? CATEGORY_LABELS[day.category] : "Rest";
}

interface WeeklyOverviewProps {
  week: WeekDayOverview[];
}

/** A seven-day strip so the week's shape — training, cardio, recovery, rest — reads at a glance. */
export function WeeklyOverview({ week }: WeeklyOverviewProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (week.length === 0) return null;

  const weekSummary = week
    .map((day, index) => `${DAY_LABELS[index]}: ${summaryFor(day)}`)
    .join(", ");

  return (
    <View style={styles.row} accessible accessibilityLabel={`This week: ${weekSummary}`}>
      {week.map((day, index) => (
        <View key={day.date} style={styles.column}>
          <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{DAY_LABELS[index]}</Text>
          <View
            style={[
              styles.pill,
              day.isToday && styles.pillToday,
              !day.isFuture && day.category && day.category !== "rest" ? styles.pillActive : undefined,
            ]}
          >
            <Text style={[styles.pillLabel, day.isFuture && styles.pillLabelFuture]} numberOfLines={1}>
              {day.isFuture ? "–" : PILL_LABELS[day.category ?? "rest"]}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.xs,
    },
    column: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    dayLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.color.textTertiary,
      textTransform: "uppercase",
    },
    dayLabelToday: {
      color: theme.color.accentText,
    },
    pill: {
      width: "100%",
      height: 40,
      borderRadius: theme.radius.sm,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.color.border,
      alignItems: "center",
      justifyContent: "center",
    },
    pillActive: {
      backgroundColor: theme.color.surfaceElevated,
    },
    pillToday: {
      borderColor: theme.color.accent,
      borderWidth: 2,
    },
    pillLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.color.textPrimary,
    },
    pillLabelFuture: {
      color: theme.color.textTertiary,
      fontWeight: "500",
    },
  });
}
