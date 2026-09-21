import { readFileSync } from "node:fs";
import { vi } from "vitest";
import { mockAsyncStorage } from "./test/mockAsyncStorage";

// Expo's own EXPO_PUBLIC_* env loading happens via a Babel plugin at build
// time, which doesn't run for a plain Vitest process — load .env manually,
// the same way e2e/global-setup.ts and e2e/support/fixtures.ts already do
// for the exact same reason.
for (const line of readFileSync(".env", "utf8").split("\n")) {
  if (!line.includes("=") || line.trim().startsWith("#")) continue;
  const idx = line.indexOf("=");
  const key = line.slice(0, idx).trim();
  if (!process.env[key]) process.env[key] = line.slice(idx + 1).trim();
}

// The real @react-native-async-storage/async-storage package requires
// react-native (Flow syntax, native modules) that can't load under plain
// Node — and isn't needed here anyway, since these tests only care about
// Postgres persistence, not session storage. Same mock the main unit-test
// config uses (vitest.setup.ts), just without needing jsdom/react-native-web.
vi.mock("@react-native-async-storage/async-storage", () => ({ default: mockAsyncStorage }));

// react-native-url-polyfill exists for Hermes, whose URL implementation
// isn't spec-compliant — Node's built-in URL already is, so the polyfill is
// both unnecessary here and (via its own react-native import for a
// Platform check) unparseable under plain Node.
vi.mock("react-native-url-polyfill/auto", () => ({}));
