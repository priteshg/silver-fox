import { useTheme } from "@silver-fox/ui";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { resetMockAsyncStorage } from "../../test/mockAsyncStorage";
import { AppThemeProvider, useAppTheme } from "../ThemeProvider";

function wrapper({ children }: { children: ReactNode }) {
  return <AppThemeProvider>{children}</AppThemeProvider>;
}

function useCombined() {
  return { app: useAppTheme(), ui: useTheme() };
}

describe("AppThemeProvider / theme switching", () => {
  beforeEach(() => {
    resetMockAsyncStorage();
  });

  it("defaults to dark and hands the same theme object to @silver-fox/ui's useTheme", () => {
    const { result } = renderHook(useCombined, { wrapper });
    expect(result.current.app.mode).toBe("dark");
    expect(result.current.ui.color.background).toBe(result.current.app.theme.color.background);
  });

  it("switching to light updates the resolved theme reactively", () => {
    const { result } = renderHook(useCombined, { wrapper });
    const darkBackground = result.current.ui.color.background;

    act(() => result.current.app.setPreference("light"));

    expect(result.current.app.mode).toBe("light");
    expect(result.current.ui.color.background).not.toBe(darkBackground);
  });

  it("switching back to dark restores the dark palette", () => {
    const { result } = renderHook(useCombined, { wrapper });
    act(() => result.current.app.setPreference("light"));
    act(() => result.current.app.setPreference("dark"));
    expect(result.current.app.mode).toBe("dark");
  });

  it("persists the chosen preference across a fresh provider instance", async () => {
    const first = renderHook(() => useAppTheme(), { wrapper });
    act(() => first.result.current.setPreference("light"));

    // A second provider instance stands in for the app restarting.
    const second = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(second.result.current.preference).toBe("light"));
    expect(second.result.current.mode).toBe("light");
  });
});
