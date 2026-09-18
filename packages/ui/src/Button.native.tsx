import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "./ThemeContext";
import type { ButtonProps } from "./types";
import type { Theme } from "@silver-fox/config";

export function Button({ label, onPress, variant = "primary", disabled, accessibilityLabel }: ButtonProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={isPrimary ? styles.primaryLabel : styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      minHeight: theme.touchTarget.comfortable,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    primary: {
      backgroundColor: theme.color.accent,
    },
    secondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.color.border,
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.85,
    },
    primaryLabel: {
      color: theme.color.background,
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: theme.typography.typeScale.body.fontWeight,
    },
    secondaryLabel: {
      color: theme.color.textPrimary,
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: theme.typography.typeScale.body.fontWeight,
    },
  });
}
