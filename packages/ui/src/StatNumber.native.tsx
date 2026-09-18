import type { Theme } from "@silver-fox/config";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "./ThemeContext";
import type { StatNumberProps } from "./types";

export function StatNumber({ value, label }: StatNumberProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <View accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    value: {
      fontSize: theme.typography.typeScale.statLarge.fontSize,
      lineHeight: theme.typography.typeScale.statLarge.lineHeight,
      fontWeight: theme.typography.typeScale.statLarge.fontWeight,
      color: theme.color.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    label: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: theme.typography.typeScale.caption.fontWeight,
      letterSpacing: theme.typography.typeScale.caption.letterSpacing,
      color: theme.color.textSecondary,
      textTransform: "uppercase",
    },
  });
}
