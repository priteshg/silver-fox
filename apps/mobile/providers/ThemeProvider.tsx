import { themes, type Theme, type ThemeMode } from "@silver-fox/config";
import { ThemeContextProvider } from "@silver-fox/ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { readJson, writeJson } from "../lib/storage/asyncStore";
import { STORAGE_KEYS } from "../lib/storage/keys";

export type ThemePreference = ThemeMode | "system";

interface AppThemeContextValue {
  theme: Theme;
  /** The resolved mode — "system" is always resolved to "light" or "dark" before use. */
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Owns the user's theme preference (persisted, defaulting to "system") and
 * resolves it against the OS colour scheme. Wraps children in
 * `@silver-fox/ui`'s ThemeContextProvider so every design-system component —
 * and any app component calling `useTheme()` from `@silver-fox/ui` — reacts
 * automatically, without needing to know this provider exists.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");

  useEffect(() => {
    readJson(STORAGE_KEYS.themePreference).then((raw) => {
      if (isThemePreference(raw)) setPreferenceState(raw);
    });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void writeJson(STORAGE_KEYS.themePreference, next);
  }, []);

  const mode: ThemeMode = preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;
  const theme = themes[mode];

  const value = useMemo<AppThemeContextValue>(
    () => ({ theme, mode, preference, setPreference }),
    [theme, mode, preference, setPreference],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeContextProvider theme={theme}>{children}</ThemeContextProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }
  return context;
}
