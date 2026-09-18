import type { Theme } from "@silver-fox/config";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "./ThemeContext";
import type { LoadingStateProps } from "./types";

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={theme.color.accent} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
    },
  });
}
