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
vi.mock("./lib/supabase/client", () => ({
  supabase: {
    ...createFakeSupabaseClient(fakeSupabaseDb),
    // fakeSupabase.ts is deliberately scoped to the query-builder API only
    // (see its own doc comment) — auth doesn't belong there. This exists
    // solely so AuthProvider (which calls this directly, not through
    // lib/supabase/auth.ts) can mount in tests without crashing; component
    // tests that actually exercise auth state changes should call the
    // captured listener themselves rather than relying on real behavior here.
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

export const TEST_USER_ID = "test-user";
// vi.fn() wrappers (not plain async functions) so individual test files can
// override behavior per test via vi.mocked(fn).mockResolvedValueOnce(...) /
// .mockRejectedValueOnce(...) — the standard vitest pattern, same module
// mocked once here rather than each test file inventing its own approach.
// restoreExistingSession defaults to "no session" (most component tests
// start logged out); the rest default to a bare success with no return
// value, since most callers only care whether they resolved or threw.
vi.mock("./lib/supabase/auth", () => ({
  ensureSession: vi.fn(async () => TEST_USER_ID),
  getCurrentUserId: vi.fn(async () => TEST_USER_ID),
  getCurrentUserIdSync: vi.fn(() => TEST_USER_ID),
  restoreExistingSession: vi.fn(async () => null),
  signInWithEmail: vi.fn(async () => TEST_USER_ID),
  signUpWithEmail: vi.fn(async () => ({ status: "signed_in", userId: TEST_USER_ID })),
  signOut: vi.fn(async () => {}),
  requestPasswordReset: vi.fn(async () => {}),
  exchangeRecoveryCode: vi.fn(async () => {}),
  updatePassword: vi.fn(async () => {}),
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
