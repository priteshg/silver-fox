import * as Haptics from "expo-haptics";

async function safely(run: () => Promise<void>) {
  try {
    await run();
  } catch {
    // Haptics aren't available on this platform/device (e.g. web) — fail silently.
  }
}

/** Thin, failure-safe wrapper so call sites never need their own try/catch. */
export const haptics = {
  light: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
