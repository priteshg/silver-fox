import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { haptics } from "../lib/haptics";

interface PrimaryCTAProps {
  label: string;
  subLabel?: string;
  onPress: () => void;
  disabled?: boolean;
}

/** The one obvious, unmissable action on a screen — "Start Workout" and nothing smaller. */
export function PrimaryCTA({ label, subLabel, onPress, disabled }: PrimaryCTAProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={() => {
        void haptics.medium();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={subLabel ? `${label}, ${subLabel}` : label}
      style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && styles.buttonPressed]}
    >
      <Text style={styles.label}>{label}</Text>
      {subLabel ? <Text style={styles.subLabel}>{subLabel}</Text> : null}
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    button: {
      minHeight: theme.touchTarget.large,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      gap: 2,
    },
    buttonPressed: {
      opacity: 0.9,
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    label: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: theme.color.background,
      textTransform: "uppercase",
    },
    subLabel: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: "600",
      color: theme.color.background,
      opacity: 0.75,
    },
  });
}
