import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export function Stepper({ label, value, min = 0, max = 999, step = 1, onChange, suffix }: StepperProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${label}: ${value}${suffix ? ` ${suffix}` : ""}`}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          onPress={decrement}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => [styles.button, (value <= min || pressed) && styles.buttonDisabled]}
        >
          <Text style={styles.buttonLabel}>−</Text>
        </Pressable>
        <Text style={styles.value}>
          {value}
          {suffix ? <Text style={styles.suffix}> {suffix}</Text> : null}
        </Text>
        <Pressable
          onPress={increment}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => [styles.button, (value >= max || pressed) && styles.buttonDisabled]}
        >
          <Text style={styles.buttonLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: theme.typography.typeScale.caption.fontWeight,
      letterSpacing: theme.typography.typeScale.caption.letterSpacing,
      color: theme.color.textSecondary,
      textTransform: "uppercase",
    },
    controls: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    button: {
      width: theme.touchTarget.comfortable,
      height: theme.touchTarget.comfortable,
      borderRadius: theme.radius.md,
      backgroundColor: theme.color.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    buttonLabel: {
      fontSize: theme.typography.typeScale.h2.fontSize,
      color: theme.color.textPrimary,
      fontWeight: "700",
    },
    value: {
      minWidth: 56,
      textAlign: "center",
      fontSize: theme.typography.typeScale.h2.fontSize,
      fontWeight: theme.typography.typeScale.h2.fontWeight,
      color: theme.color.textPrimary,
    },
    suffix: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
    },
  });
}
