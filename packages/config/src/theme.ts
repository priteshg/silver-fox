import { darkColors, lightColors, type ColorToken } from "./tokens/color";
import { duration, easing } from "./tokens/motion";
import { elevation } from "./tokens/elevation";
import { iconSize } from "./tokens/iconSize";
import { radius } from "./tokens/radius";
import { spacing } from "./tokens/spacing";
import { touchTarget } from "./tokens/touchTarget";
import { fontFamily, typeScale } from "./tokens/typography";

function buildTheme(colors: Record<ColorToken, string>) {
  return {
    color: colors,
    spacing,
    radius,
    elevation,
    iconSize,
    touchTarget,
    motion: { duration, easing },
    typography: { fontFamily, typeScale },
  } as const;
}

export type ThemeMode = "light" | "dark";

export const darkTheme = buildTheme(darkColors);
export const lightTheme = buildTheme(lightColors);

export const themes: Record<ThemeMode, Theme> = { dark: darkTheme, light: lightTheme };

/** @deprecated Use `useTheme()` from `@silver-fox/ui` for a theme that reacts to the user's preference. */
export const theme = darkTheme;

export type Theme = typeof darkTheme;
