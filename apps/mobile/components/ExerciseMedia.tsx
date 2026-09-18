import type { ExerciseMedia } from "@silver-fox/domain";
import type { Theme } from "@silver-fox/config";
import { useTheme } from "@silver-fox/ui";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface ExerciseMediaViewProps {
  media?: ExerciseMedia;
  exerciseName: string;
  height?: number;
}

/**
 * Renders whatever an exercise's `media` points to (image, gif, or a
 * placeholder), failing gracefully to a placeholder if the media has no
 * usable URL or fails to load. Video isn't wired to a player yet — no
 * exercise ships with real video today, and adding a video-player
 * dependency isn't justified until one does — so it renders the same
 * honest placeholder with a video-specific label.
 */
export function ExerciseMediaView({ media, exerciseName, height = 160 }: ExerciseMediaViewProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, height), [theme, height]);
  const [hasError, setHasError] = useState(false);

  // A failed load shouldn't stick around once the component starts pointing
  // at different media (e.g. the user switches exercises) — otherwise every
  // exercise after a broken one would incorrectly show the fallback too.
  useEffect(() => {
    setHasError(false);
  }, [media?.url]);

  const type = media?.type ?? "placeholder";
  const hasUsableUrl = !!media?.url && !hasError;

  if ((type === "image" || type === "gif") && hasUsableUrl) {
    return (
      <View style={styles.frame}>
        <Image
          source={{ uri: media.url }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setHasError(true)}
          accessible
          accessibilityLabel={media.altText ?? `${exerciseName} demonstration`}
        />
      </View>
    );
  }

  const label = type === "video" ? "Video demonstration coming soon" : "Demonstration coming soon";
  const monogram = exerciseName.trim().charAt(0).toUpperCase() || "?";

  return (
    <View style={styles.placeholder} accessible accessibilityLabel={`${exerciseName} demonstration placeholder`}>
      <Text style={styles.placeholderMonogram} accessibilityElementsHidden>
        {monogram}
      </Text>
      <View style={styles.placeholderTag}>
        <Text style={styles.placeholderTagLabel}>{label}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: Theme, height: number) {
  return StyleSheet.create({
    frame: {
      height,
      borderRadius: theme.radius.lg,
      overflow: "hidden",
      backgroundColor: theme.color.surfaceElevated,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    placeholder: {
      height,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.color.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.color.border,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    placeholderMonogram: {
      fontSize: height * 0.6,
      fontWeight: "700",
      color: theme.color.surface,
      lineHeight: height * 0.7,
    },
    placeholderTag: {
      position: "absolute",
      left: theme.spacing.md,
      bottom: theme.spacing.md,
      backgroundColor: theme.color.background,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    placeholderTagLabel: {
      color: theme.color.textTertiary,
      fontSize: theme.typography.typeScale.caption.fontSize,
      fontWeight: "600",
    },
  });
}
