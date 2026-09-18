import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/**
 * The full-bleed editorial masthead at the top of Home — breaks out of
 * ScreenContainer's side padding via negative margins so it reads as a
 * section on its own rather than another card floating in a list.
 */
export function HeroSection({ title, subtitle, children }: HeroSectionProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.bleed}>
      <View style={styles.glow} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children ? <View style={styles.children}>{children}</View> : null}
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    bleed: {
      marginHorizontal: -theme.spacing.lg,
      marginTop: -theme.spacing.lg,
      backgroundColor: theme.color.background,
      overflow: "hidden",
    },
    glow: {
      position: "absolute",
      top: -140,
      right: -100,
      width: 320,
      height: 320,
      borderRadius: 999,
      backgroundColor: theme.color.accent,
      opacity: 0.16,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xxl,
      paddingBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.typeScale.hero.fontSize,
      lineHeight: theme.typography.typeScale.hero.lineHeight,
      fontWeight: theme.typography.typeScale.hero.fontWeight,
      letterSpacing: theme.typography.typeScale.hero.letterSpacing,
      color: theme.color.textPrimary,
      textTransform: "uppercase",
    },
    subtitle: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.typeScale.body.fontSize,
      color: theme.color.textSecondary,
      maxWidth: 320,
    },
    children: {
      marginTop: theme.spacing.lg,
    },
  });
}
