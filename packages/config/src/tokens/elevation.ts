/**
 * Elevation expressed platform-neutrally. Each app maps this to
 * box-shadow (web) or shadow/elevation props (React Native).
 */
export interface ElevationStyle {
  /** Android `elevation` and a proxy for perceived depth on web/iOS. */
  level: number;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffsetY: number;
}

export const elevation: Record<"none" | "raised" | "overlay", ElevationStyle> = {
  none: { level: 0, shadowOpacity: 0, shadowRadius: 0, shadowOffsetY: 0 },
  raised: { level: 2, shadowOpacity: 0.24, shadowRadius: 12, shadowOffsetY: 4 },
  overlay: { level: 8, shadowOpacity: 0.32, shadowRadius: 24, shadowOffsetY: 8 },
};

export type ElevationToken = keyof typeof elevation;
