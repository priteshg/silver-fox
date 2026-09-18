import { darkTheme, type Theme } from "@silver-fox/config";
import { createContext, useContext, type ReactNode } from "react";

const ThemeContext = createContext<Theme>(darkTheme);

/**
 * Provides the active theme to every `@silver-fox/ui` component. Defaults to
 * dark so consumers that never wrap in a provider (e.g. apps/web today) keep
 * working exactly as before.
 */
export function ThemeContextProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
