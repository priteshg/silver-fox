import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface MetricCardProps {
  value: string;
  label: string;
  caption?: string;
  /** Use for a text value (a programme or exercise name) rather than a short number — statLarge is too big to fit a name. */
  compact?: boolean;
}

/** A single quick-read stat tile — streak, volume, bodyweight — for a row of at-a-glance numbers. */
export function MetricCard({ value, label, caption, compact = false }: MetricCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card} accessible accessibilityLabel={`${label}: ${value}${caption ? `, ${caption}` : ""}`}>
      <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={compact ? 2 : 1}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
      {caption ? (
        <Text style={styles.caption} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexBasis: "47%",
      flexGrow: 1,
      backgroundColor: theme.color.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.color.border,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: 2,
    },
    value: {
      fontSize: theme.typography.typeScale.statLarge.fontSize,
      fontWeight: theme.typography.typeScale.statLarge.fontWeight,
      letterSpacing: theme.typography.typeScale.statLarge.letterSpacing,
      color: theme.color.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    valueCompact: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      lineHeight: theme.typography.typeScale.h3.lineHeight,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      letterSpacing: 0,
    },
    label: {
      fontSize: theme.typography.typeScale.eyebrow.fontSize,
      fontWeight: theme.typography.typeScale.eyebrow.fontWeight,
      letterSpacing: theme.typography.typeScale.eyebrow.letterSpacing,
      color: theme.color.textSecondary,
      textTransform: "uppercase",
    },
    caption: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.caption.fontSize,
      color: theme.color.textTertiary,
    },
  });
}
