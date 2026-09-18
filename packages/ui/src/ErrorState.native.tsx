import type { Theme } from "@silver-fox/config";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { useTheme } from "./ThemeContext";
import type { ErrorStateProps } from "./types";

export function ErrorState({
  title = "Something went wrong",
  description,
  retryLabel = "Try Again",
  onRetry,
}: ErrorStateProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container} accessible accessibilityRole="alert">
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {onRetry ? (
        <View style={styles.action}>
          <Button label={retryLabel} variant="secondary" onPress={onRetry} />
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
      color: theme.color.danger,
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
