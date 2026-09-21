import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";
import { createFakeDb, createFakeSupabaseClient } from "./test/fakeSupabase";
import { mockAsyncStorage } from "./test/mockAsyncStorage";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: mockAsyncStorage }));

// Repository tests run against this in-memory fake instead of a live
// Postgres connection — see test/fakeSupabase.ts. Every repository imports
// `supabase` from "../supabase/client", which all resolve to this one
// mocked module, so one fake db backs every repository test.
export const fakeSupabaseDb = createFakeDb();
vi.mock("./lib/supabase/client", () => ({ supabase: createFakeSupabaseClient(fakeSupabaseDb) }));

export const TEST_USER_ID = "test-user";
vi.mock("./lib/supabase/auth", () => ({
  ensureSession: async () => TEST_USER_ID,
  getCurrentUserId: async () => TEST_USER_ID,
  getCurrentUserIdSync: () => TEST_USER_ID,
}));

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
