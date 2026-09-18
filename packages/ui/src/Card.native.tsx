import type { Theme } from "@silver-fox/config";
import { StyleSheet, View } from "react-native";
import { useTheme } from "./ThemeContext";
import type { CardProps } from "./types";

export function Card({ children, elevated = false }: CardProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return <View style={[styles.base, elevated && styles.elevated]}>{children}</View>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      backgroundColor: theme.color.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.color.border,
    },
    elevated: {
      elevation: theme.elevation.raised.level,
      shadowColor: "#000000",
      shadowOpacity: theme.elevation.raised.shadowOpacity,
      shadowRadius: theme.elevation.raised.shadowRadius,
      shadowOffset: { width: 0, height: theme.elevation.raised.shadowOffsetY },
    },
  });
}
