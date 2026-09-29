import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import { WORKER_COUNT } from "./e2e/support/workerCount";

// Generates real spec files from the listed .feature files +
// e2e/steps/*.steps.ts into a directory *inside* the existing `testDir`
// ("./e2e") below, so the generated tests are picked up by Playwright's own
// default recursive testMatch with no other config changes — they run
// alongside, not instead of, the hand-written e2e/journeys/*.spec.ts suite.
// `bddgen` (see package.json) must run before `playwright test` to produce
// these files; the directory is git- and watcher-ignored as a build artifact.
//
// Only feature files with a matching step file are listed here — bddgen
// can't generate a spec for a scenario with zero step definitions (it can't
// infer which fixtures `test` instance to use). The other 10 feature files
// under e2e/features/ remain documentation-only until they get their own
// step files; add each one here as it's covered.
//
// The returned path is more than a location: playwright-bdd's runtime
// fixtures look up each generated test's BDD config *by the testDir of the
// project running it* (confirmed directly — nesting the output dir inside
// the existing "./e2e" testDir and relying on default recursive testMatch
// produced "BDD config not found for testDir" at run time). So generated
// tests need a project whose `testDir` is exactly this string — see the
// dedicated "bdd" project below, and the matching `testIgnore` on the other
// two projects so they don't also try (and fail) to collect the same files.
const bddTestDir = defineBddConfig({
  features: [
    "e2e/features/profile.feature",
    "e2e/features/programmes.feature",
    "e2e/features/programme_exercises.feature",
    "e2e/features/exercise_library.feature",
    "e2e/features/exercise_substitution.feature",
    "e2e/features/workout_sets.feature",
    "e2e/features/conditioning.feature",
    "e2e/features/progress.feature",
    "e2e/features/workout_history.feature",
    "e2e/features/workouts.feature",
    "e2e/features/demo_experience.feature",
    "e2e/features/data_privacy.feature",
    "e2e/features/starting_primeform.feature",
  ],
  // Step files import their extended `test` from e2e/fixtures/bddFixtures.ts
  // — that file must be in this glob too, or bddgen can't infer which
  // custom test instance the step files use.
  steps: ["e2e/steps/*.steps.ts", "e2e/fixtures/bddFixtures.ts"],
  outputDir: "e2e/.features-gen",
  // Scenarios tagged @webgap are real, documented gaps — mostly Alert.alert
  // being a no-op on react-native-web (see e2e/journeys/delete-workflows.spec.ts)
  // — not missing step definitions. @specmismatch means the scenario's own
  // numbers contradict the real implementation. Both excluded here rather
  // than given fake or silently-wrong steps. (No scenario currently needs
  // @signupgap — every signup-dependent scenario now drives the real
  // screens, using the Admin API only to stand in for clicking an emailed
  // confirmation link — see e2e/support/adminAuth.ts.)
  tags: "not @webgap and not @specmismatch",
});

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
  // Local runs surface a broken test immediately, as-is — hiding flake
  // behind a retry is exactly what makes a suite slow *and* untrustworthy.
  // CI (once this project has one) is the only place a retry is legitimate,
  // to absorb genuine environment noise without masking a real regression.
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["json", { outputFile: "e2e/report/results.json" }], ["html", { open: "never" }]],
  // Tiered, deliberately tight: a healthy run's own numbers (see
  // E2E_PERFORMANCE_AUDIT.md and this session's measurements) are ~1s
  // navigations and low-single-digit-second actions against a warm,
  // production-mode bundle. These ceilings exist to make a *broken* run fail
  // in seconds, not minutes — they are not the expected normal duration.
  timeout: 30_000, // per-test ceiling: several actions/assertions chained, not one
  expect: {
    timeout: 5_000, // per web-first-assertion ceiling (toBeVisible, toHaveText, ...)
  },
  // Signs in once per worker for the whole run — see global-setup.ts for why
  // a fresh anonymous user per test is not viable (Supabase's own rate limit).
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:8081",
    // No default storageState here — every spec either goes through
    // support/fixtures.ts's readyPage (which picks the right per-worker
    // session file explicitly) or overrides this itself (e.g.
    // demo-experience.spec.ts, which deliberately wants no session).
    navigationTimeout: 10_000,
    actionTimeout: 5_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  // Two projects, two different jobs — not two copies of the same suite.
  // "desktop-chromium" (no `grep`) runs everything: it's the primary,
  // fastest project, and the vast majority of this suite is genuinely
  // viewport-independent business logic that gains nothing from running
  // twice. "mobile" runs *only* tests tagged `@mobile` — real-device-shaped
  // concerns (bottom-nav bounds, touch-target size) that a desktop viewport
  // can't meaningfully check. Previously both projects ran the full ~70-test
  // suite unconditionally — the only test that actually depended on the
  // viewport already forced its own viewport via `test.use()` regardless of
  // which project ran it, making that duplication pure waste, not coverage.
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: /@mobile/,
      testIgnore: /[\\/]\.features-gen[\\/]/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      grep: /@mobile/,
      testIgnore: /[\\/]\.features-gen[\\/]/,
    },
    // playwright-bdd-generated tests (from e2e/features/*.feature +
    // e2e/steps/*.steps.ts — see the defineBddConfig() call above) —
    // deliberately its own project: playwright-bdd's runtime resolves each
    // generated test's config by the *project's* testDir, which must match
    // bddTestDir exactly.
    {
      name: "bdd",
      testDir: bddTestDir,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // A genuine static export (`expo export -p web`) served by a plain
    // static file server (`serve`), not Metro's own dev server — even in
    // `--no-dev --minify` mode, `expo start --web` is still Metro itself
    // serving every request live, and Metro was never built to sustain 4
    // concurrent Playwright browser sessions hammering it for several
    // minutes straight. That's not a hypothesis: it reproduced directly and
    // repeatedly in this project — the dev server went unresponsive under
    // real test load on separate occasions, each time producing every
    // in-flight test's `page.goto` timing out identically, minutes into an
    // otherwise-healthy run. A static export removes the bundler from the
    // request path entirely for the run's whole duration: `serve` just reads
    // files off disk, so it has none of Metro's per-request/HMR/bundling
    // state to fall over under concurrent load. `-s` (single-page-app mode)
    // is required — without it, a direct navigation or reload on a
    // client-side route like /workout/active 404s instead of serving
    // index.html for expo-router to take over.
    command: "pnpm run build:e2e-web && pnpm exec serve e2e-dist -l 8081 -s",
    url: "http://localhost:8081",
    // Locally, reuse a server you already have running for fast iteration —
    // but never in CI, where "something is listening on this port" must
    // never be trusted as "the right, healthy build is listening on this
    // port".
    reuseExistingServer: !process.env.CI,
    // Covers the one-time static export build (~30-35s measured) plus
    // `serve` starting up — not a per-test budget, and not a bundler
    // compile-on-demand cost anymore since the export is fully pre-built.
    timeout: 90_000,
  },
});
