import type { Theme } from "@silver-fox/config";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { useTheme } from "./ThemeContext";
import type { EmptyStateProps } from "./types";

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container} accessible accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    title: {
      fontSize: theme.typography.typeScale.h3.fontSize,
      fontWeight: theme.typography.typeScale.h3.fontWeight,
      color: theme.color.textPrimary,
      textAlign: "center",
    },
    description: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
      textAlign: "center",
    },
    action: {
      marginTop: theme.spacing.md,
    },
  });
}
