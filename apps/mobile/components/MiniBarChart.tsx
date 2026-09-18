import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface MiniBarChartProps {
  /** Oldest first. */
  values: number[];
  formatValue?: (value: number) => string;
  /** Read by screen readers instead of trying to describe the bars visually. */
  accessibilityLabel?: string;
}

/**
 * A minimal bar chart built from plain Views, avoiding an extra charting
 * dependency for what is currently a handful of data points.
 */
export function MiniBarChart({ values, formatValue, accessibilityLabel }: MiniBarChartProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const summary = accessibilityLabel ?? `Chart of ${values.length} sessions, values ${values.join(", ")}`;

  return (
    <View style={styles.container} accessible accessibilityLabel={summary}>
      {values.map((value, index) => (
        <View key={index} style={styles.barColumn}>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: `${Math.max(4, (value / max) * 100)}%` }]} />
          </View>
          {formatValue ? <Text style={styles.barLabel}>{formatValue(value)}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: 96,
      gap: theme.spacing.xs,
    },
    barColumn: {
      flex: 1,
      height: "100%",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: theme.spacing.xs,
    },
    barTrack: {
      flex: 1,
      width: "100%",
      justifyContent: "flex-end",
    },
    bar: {
      width: "100%",
      minHeight: 4,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.color.accent,
    },
    barLabel: {
      fontSize: 10,
      color: theme.color.textTertiary,
    },
  });
}
