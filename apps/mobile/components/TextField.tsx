import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, style, ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.color.textTertiary}
        accessibilityLabel={label}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: theme.typography.typeScale.caption.fontWeight,
      letterSpacing: theme.typography.typeScale.caption.letterSpacing,
      color: theme.color.textSecondary,
      textTransform: "uppercase",
    },
    input: {
      minHeight: theme.touchTarget.comfortable,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      paddingHorizontal: theme.spacing.md,
      color: theme.color.textPrimary,
      fontSize: theme.typography.typeScale.body.fontSize,
    },
  });
}
