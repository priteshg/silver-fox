import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.chipPressed]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    chip: {
      paddingHorizontal: theme.spacing.md,
      height: theme.touchTarget.min,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    chipSelected: {
      backgroundColor: theme.color.accent,
      borderColor: theme.color.accent,
    },
    chipPressed: {
      opacity: 0.85,
    },
    label: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.color.textPrimary,
    },
    labelSelected: {
      color: theme.color.background,
    },
  });
}
