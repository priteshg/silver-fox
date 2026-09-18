/**
 * System font stacks avoid shipping a custom font as a dependency while still
 * looking native on each platform.
 */
export const fontFamily = {
  ios: "-apple-system",
  android: "Roboto",
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: "400" | "500" | "600" | "700";
  letterSpacing?: number;
}

export interface TypeScale {
  /** Editorial hero headlines only, e.g. the Home screen's masthead line. */
  hero: TypeStyle;
  display: TypeStyle;
  h1: TypeStyle;
  h2: TypeStyle;
  h3: TypeStyle;
  body: TypeStyle;
  bodySmall: TypeStyle;
  /** Small tracked-out uppercase overline, e.g. "TODAY" above a session name. */
  eyebrow: TypeStyle;
  caption: TypeStyle;
  statLarge: TypeStyle;
}

/** `statLarge` is tuned for the large, tabular workout numbers (weight, reps, timers). */
export const typeScale: TypeScale = {
  hero: { fontSize: 52, lineHeight: 56, fontWeight: "700", letterSpacing: -1.5 },
  display: { fontSize: 40, lineHeight: 48, fontWeight: "700", letterSpacing: -0.5 },
  h1: { fontSize: 32, lineHeight: 40, fontWeight: "700" },
  h2: { fontSize: 24, lineHeight: 32, fontWeight: "600" },
  h3: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 1.6 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.2 },
  statLarge: { fontSize: 44, lineHeight: 48, fontWeight: "700", letterSpacing: -1 },
};

export type TypeScaleToken = keyof TypeScale;
