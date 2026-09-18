import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { haptics } from "../lib/haptics";

interface RestTimerBarProps {
  remainingSeconds: number;
  totalSeconds: number;
  isPaused: boolean;
  onSkip: () => void;
  onAddTime: (seconds: number) => void;
  onPause: () => void;
  onResume: () => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function RestTimerBar({
  remainingSeconds,
  totalSeconds,
  isPaused,
  onSkip,
  onAddTime,
  onPause,
  onResume,
}: RestTimerBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const progress = totalSeconds > 0 ? Math.min(1, 1 - remainingSeconds / totalSeconds) : 0;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Rest timer, ${formatTime(remainingSeconds)} remaining${isPaused ? ", paused" : ""}`}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>
          {isPaused ? "Paused" : "Rest"} — {formatTime(remainingSeconds)}
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              void haptics.light();
              onAddTime(15);
            }}
            accessibilityRole="button"
            accessibilityLabel="Add 15 seconds"
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonLabel}>+15s</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void haptics.light();
              onAddTime(30);
            }}
            accessibilityRole="button"
            accessibilityLabel="Add 30 seconds"
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonLabel}>+30s</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void haptics.light();
              if (isPaused) {
                onResume();
              } else {
                onPause();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? "Resume rest timer" : "Pause rest timer"}
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonLabel}>{isPaused ? "Resume" : "Pause"}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void haptics.light();
              onSkip();
            }}
            accessibilityRole="button"
            accessibilityLabel="Skip rest"
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonLabel}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.color.surfaceElevated,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    track: {
      height: 4,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.color.border,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      backgroundColor: theme.color.accent,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "700",
      color: theme.color.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    smallButton: {
      height: theme.touchTarget.min,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.color.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    smallButtonLabel: {
      color: theme.color.textSecondary,
      fontWeight: "600",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
    },
    skipButton: {
      height: theme.touchTarget.min,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.color.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    skipButtonLabel: {
      color: theme.color.background,
      fontWeight: "700",
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
    },
  });
}
