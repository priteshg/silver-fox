import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";
import { mockAsyncStorage } from "./test/mockAsyncStorage";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: mockAsyncStorage }));

// react-native-safe-area-context's real entry point isn't jsdom-safe; component
// tests don't need real safe-area insets, so this stands in for it.
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// expo-haptics needs real native bindings (globalThis.expo) that don't exist
// under jsdom; component tests only need it to resolve without throwing.
vi.mock("expo-haptics", () => ({
  impactAsync: async () => {},
  notificationAsync: async () => {},
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

afterEach(cleanup);
