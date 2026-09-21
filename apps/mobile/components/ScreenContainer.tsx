import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useMemo, type ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
}

/** Consistent background + safe-area + padding wrapper used by every screen. */
export function ScreenContainer({ children, scroll = true, contentContainerStyle }: ScreenContainerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!scroll) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={[styles.content, styles.nonScrollContent, contentContainerStyle as object]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    // Without flex: 1, this View (and any ScrollView nested inside it, e.g.
    // the workout screen's set list) has no bounded height to scroll within
    // — its content just grows past the bottom of the safe area instead of
    // scrolling inside it, landing underneath the Android system nav bar.
    nonScrollContent: {
      flex: 1,
    },
  });
}
