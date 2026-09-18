import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  action?: { label: string; onPress: () => void };
}

/** The recurring "EYEBROW / Title / optional action" header used to open every major section. */
export function SectionHeader({ eyebrow, title, action }: SectionHeaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <View style={styles.textColumn}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={action.label}>
          <Text style={styles.action}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    textColumn: {
      gap: 2,
    },
    eyebrow: {
      fontSize: theme.typography.typeScale.eyebrow.fontSize,
      fontWeight: theme.typography.typeScale.eyebrow.fontWeight,
      letterSpacing: theme.typography.typeScale.eyebrow.letterSpacing,
      color: theme.color.accentText,
      textTransform: "uppercase",
    },
    title: {
      fontSize: theme.typography.typeScale.h2.fontSize,
      fontWeight: theme.typography.typeScale.h2.fontWeight,
      color: theme.color.textPrimary,
    },
    action: {
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.color.textSecondary,
    },
  });
}
