import { defineConfig, devices } from "@playwright/test";
import { WORKER_COUNT } from "./e2e/support/workerCount";

/**
 * Drives the actual product surface — the Expo web build of the mobile app
 * — not apps/web, which is a design-system showcase with no real journeys.
 * Tests run against a real Supabase backend (see e2e/support/fixtures.ts for
 * the isolation/cleanup strategy): every *worker* gets its own isolated
 * anonymous user (minted once in e2e/global-setup.ts, not per test — see
 * that file for why), reused across every test that worker runs, and each
 * spec cleans up what it created via its own worker's user. Because RLS
 * scopes every table to `auth.uid()`, two workers running concurrently can
 * never see or touch each other's rows even by an incorrect cleanup filter
 * — see E2E_PERFORMANCE_AUDIT.md for the full reasoning behind running with
 * more than one worker.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: WORKER_COUNT,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "e2e/report/results.json" }], ["html", { open: "never" }]],
  // 60s covers the one-time Metro bundle compile on a cold server start
  // (~15-20s) plus real test work. Full-page reloads themselves are now fast
  // (~0.5-1s) since the webServer below runs in production mode — an
  // unminified dev bundle was previously making every reload take ~28-30s.
  timeout: 60_000,
  // Signs in once for the whole run — see global-setup.ts for why a fresh
  // anonymous user per test is not viable (Supabase's own rate limit).
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:8081",
    // No default storageState here — every spec either goes through
    // support/fixtures.ts's readyPage (which picks the right per-worker
    // session file explicitly) or overrides this itself (e.g.
    // demo-experience.spec.ts, which deliberately wants no session).
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "android-pixel-7",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // --no-dev --minify: production-mode bundle. The unminified dev bundle
    // made every full-page reload take ~28-30s (confirmed by direct
    // measurement); production mode cuts that to ~0.5-1s with no change to
    // app behavior under test.
    command: "pnpm exec expo start --web --no-dev --minify",
    url: "http://localhost:8081",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
