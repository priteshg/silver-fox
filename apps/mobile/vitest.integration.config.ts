import { defineConfig } from "vitest/config";

/**
 * A deliberately separate config from vitest.config.ts: that one's
 * `setupFiles` mocks `lib/supabase/client` with an in-memory fake for every
 * component/unit test, which is right for those but useless here — these
 * tests exist specifically to prove that adversarial input survives a real
 * Postgres round trip via Supabase's own parameterized queries, which an
 * in-memory JS object can't tell you anything about. No setupFiles, no
 * jsdom: plain Node, a real (test-project) network connection. Moved here
 * from 18 Playwright tests that proved the identical thing through a full
 * browser — see E2E_PERFORMANCE_AUDIT.md §2.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["integration/**/*.test.ts"],
    setupFiles: ["./vitest.integration.setup.ts"],
    testTimeout: 20_000,
  },
});
