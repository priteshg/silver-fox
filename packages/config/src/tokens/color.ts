/** Dark-first palette — the default, and the one optimised for gym use. */
export const darkColors = {
  background: "#0A0A0B",
  surface: "#17181C",
  surfaceElevated: "#1F2126",
  border: "#2A2C31",

  textPrimary: "#F5F5F7",
  textSecondary: "#A0A3AB",
  textTertiary: "#6B6E76",

  /** Cool silver — secondary brand accent. */
  silver: "#C8CDD6",
  /** Warm fox accent — primary actions and highlights. */
  accent: "#FF7A45",
  accentPressed: "#E0672F",
  /** accent, but guaranteed readable as text/icon on this theme's background. */
  accentText: "#FF9466",

  success: "#3DD68C",
  warning: "#FFC24B",
  danger: "#FF5C5C",
} as const;

/**
 * Light palette. Same brand hues as dark, re-tuned for contrast on light
 * surfaces — e.g. `accentText` is a darker, more saturated orange than
 * `accent` because the light-orange used for dark-mode fills doesn't meet
 * contrast requirements as text on a white background.
 */
export const lightColors = {
  background: "#F7F7F8",
  surface: "#FFFFFF",
  surfaceElevated: "#EFEFF1",
  border: "#E1E2E5",

  textPrimary: "#101113",
  textSecondary: "#53565D",
  textTertiary: "#797C83",

  silver: "#6B6E76",
  accent: "#FF7A45",
  accentPressed: "#E0672F",
  accentText: "#C1500F",

  success: "#1B8F55",
  warning: "#A66A00",
  danger: "#D93025",
} as const;

export type ColorToken = keyof typeof darkColors;
