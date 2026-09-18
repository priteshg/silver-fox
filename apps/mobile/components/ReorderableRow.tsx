import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ReorderableRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function ReorderableRow({
  title,
  subtitle,
  onPress,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp = true,
  canMoveDown = true,
}: ReorderableRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.info}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      >
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Pressable>
      <View style={styles.actions}>
        {onMoveUp ? (
          <Pressable
            onPress={onMoveUp}
            disabled={!canMoveUp}
            accessibilityRole="button"
            accessibilityLabel={`Move ${title} up`}
            style={[styles.iconButton, !canMoveUp && styles.iconButtonDisabled]}
          >
            <Text style={styles.iconLabel}>▲</Text>
          </Pressable>
        ) : null}
        {onMoveDown ? (
          <Pressable
            onPress={onMoveDown}
            disabled={!canMoveDown}
            accessibilityRole="button"
            accessibilityLabel={`Move ${title} down`}
            style={[styles.iconButton, !canMoveDown && styles.iconButtonDisabled]}
          >
            <Text style={styles.iconLabel}>▼</Text>
          </Pressable>
        ) : null}
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${title}`}
            style={styles.iconButton}
          >
            <Text style={[styles.iconLabel, styles.removeLabel]}>✕</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.color.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      paddingLeft: theme.spacing.md,
    },
    info: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingRight: theme.spacing.sm,
      minHeight: theme.touchTarget.comfortable,
      justifyContent: "center",
    },
    title: {
      fontSize: theme.typography.typeScale.body.fontSize,
      fontWeight: "600",
      color: theme.color.textPrimary,
    },
    subtitle: {
      marginTop: 2,
      fontSize: theme.typography.typeScale.bodySmall.fontSize,
      color: theme.color.textSecondary,
    },
    actions: {
      flexDirection: "row",
    },
    iconButton: {
      width: theme.touchTarget.min,
      height: theme.touchTarget.comfortable,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButtonDisabled: {
      opacity: 0.25,
    },
    iconLabel: {
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
    },
    removeLabel: {
      color: theme.color.danger,
    },
  });
}
