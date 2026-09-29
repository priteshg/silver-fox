import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { test as base } from "playwright-bdd";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ExerciseLibraryPage } from "../pages/ExerciseLibraryPage";
import { HomePage } from "../pages/HomePage";
import { ProfilePage } from "../pages/ProfilePage";
import { ProgrammesPage } from "../pages/ProgrammesPage";
import { ProgressPage } from "../pages/ProgressPage";
import { WorkoutPage } from "../pages/WorkoutPage";
import { WORKER_COUNT } from "../support/workerCount";

function loadEnv(): { url: string; anonKey: string } {
  const envPath = path.join(__dirname, "..", "..", ".env");
  const text = readFileSync(envPath, "utf8");
  const vars = Object.fromEntries(
    text
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      }),
  );
  if (!vars.EXPO_PUBLIC_SUPABASE_URL || !vars.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("apps/mobile/.env is missing Supabase config — the e2e suite needs a real, running backend.");
  }
  return { url: vars.EXPO_PUBLIC_SUPABASE_URL, anonKey: vars.EXPO_PUBLIC_SUPABASE_ANON_KEY };
}

const env = loadEnv();

/**
 * Reads the app's live Supabase session out of the page's localStorage and
 * builds a client authenticated as that same user. Supabase rotates refresh
 * tokens (each is single-use); the app's own client refreshes its session on
 * a background timer, so a read here can race that refresh and grab a
 * refresh_token the app has already spent — setSession() then fails, but
 * (confirmed directly: this raced and failed silently, from a client whose
 * every later getUser() call then threw AuthSessionMissingError even across
 * retries, since the client itself was never usable) supabase-js does NOT
 * throw or reject when that happens — it resolves with `error` set. Checking
 * that result and retrying with a fresh localStorage read (the app's refresh
 * has normally completed by the next attempt) is what actually recovers.
 */
async function readTestUserSession(page: import("@playwright/test").Page): Promise<{ access_token: string; refresh_token: string } | null> {
  const storageKey = await page.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token")));
  if (!storageKey) return null;
  const raw = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  return JSON.parse(raw!);
}

async function buildTestUserClient(page: import("@playwright/test").Page): Promise<SupabaseClient | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const session = await readTestUserSession(page);
    if (!session) return null;
    const client = createClient(env.url, env.anonKey);
    const { error } = await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (!error) return client;
    lastError = error;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw lastError;
}

/**
 * Same per-worker `state-N.json` files e2e/global-setup.ts already mints for
 * the hand-written suite (e2e/support/fixtures.ts) — reused rather than
 * signing in again, to stay under Supabase's anonymous-sign-in rate limit.
 */
function storageStatePathFor(workerIndex: number): string {
  return path.join(__dirname, "..", ".auth", `state-${workerIndex % WORKER_COUNT}.json`);
}

type PageFixtures = {
  homePage: HomePage;
  profilePage: ProfilePage;
  programmesPage: ProgrammesPage;
  exerciseLibraryPage: ExerciseLibraryPage;
  workoutPage: WorkoutPage;
  progressPage: ProgressPage;
  /**
   * Plain mutable object for passing small bits of state between steps
   * within one scenario — e.g. which "name" field a shared step like "I
   * leave the name blank" should target, since that exact step text is
   * reused verbatim by both programmes.feature and exercise_library.feature
   * (see e2e/steps/common.steps.ts) and can't tell which from its text alone.
   */
  scenarioState: Record<string, unknown>;
  /**
   * A supabase-js client authenticated as the same anonymous user the page
   * is using, for direct cleanup/verification. Deliberately a lazy accessor,
   * not a plain fixture value: Playwright resolves every fixture a test
   * destructures *before* the test body runs, but in a BDD scenario the
   * actual navigation happens inside the Given/When step bodies — reading
   * localStorage eagerly here would run before the page has navigated
   * anywhere (confirmed directly: it read `about:blank`). Calling this from
   * a Then step, after the earlier steps have run, is what makes it safe.
   */
  supabaseAsTestUser: () => Promise<SupabaseClient>;
  /**
   * Same client as `supabaseAsTestUser`, but returns `null` instead of
   * throwing when no session is found — for use in `After()` cleanup hooks
   * only. Cucumber/playwright-bdd `After()` hooks are global across the
   * *entire* suite, not scoped to the step file that registers them (every
   * step file's own cleanup hook runs after every scenario in every
   * feature) — confirmed directly: demo_experience.feature's scenarios
   * deliberately clear localStorage (see their own Given step), which then
   * made every *other* file's After hook throw this same "session not
   * found" error trying to clean up state that scenario never touched.
   * Nothing to clean up is a legitimate, silent outcome for a cleanup hook;
   * it isn't for a Given/When/Then step actually relying on the session.
   */
  cleanupSupabaseAsTestUser: () => Promise<SupabaseClient | null>;
  /**
   * This worker's index (0..WORKER_COUNT-1) and a helper to build the
   * storageState file path for *any* worker index — for data_privacy.feature,
   * which needs a genuinely separate, already-authenticated "second person"
   * within one scenario. Reusing another worker's already-signed-in
   * state-N.json (rather than a fresh signInAnonymously() call) avoids
   * spending any more of Supabase's anonymous-sign-in rate limit budget —
   * the whole reason global-setup mints exactly WORKER_COUNT sessions once
   * instead of one per test in the first place.
   */
  workerIndex: number;
  storageStatePathForWorker: (workerIndex: number) => string;
};

/**
 * Extended playwright-bdd test object — rooted in `playwright-bdd`'s own
 * `test`, not `@playwright/test`'s, per playwright-bdd's requirement that
 * whatever `test` is passed to `createBdd()` traces back to its base.
 * Import this `test` (not the playwright-bdd base) when calling `createBdd`.
 */
export const test = base.extend<PageFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature requires the destructure even with nothing pulled from it
  storageState: async ({}, use, testInfo) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(storageStatePathFor(testInfo.workerIndex));
  },

  homePage: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(new HomePage(page));
  },

  profilePage: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(new ProfilePage(page));
  },

  programmesPage: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(new ProgrammesPage(page));
  },

  exerciseLibraryPage: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(new ExerciseLibraryPage(page));
  },

  workoutPage: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(new WorkoutPage(page));
  },

  progressPage: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(new ProgressPage(page));
  },

  // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature requires the destructure even with nothing pulled from it
  scenarioState: async ({}, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use({});
  },

  supabaseAsTestUser: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(async () => {
      const client = await buildTestUserClient(page);
      if (!client) throw new Error("Could not find the app's Supabase session in localStorage after sign-in.");
      return client;
    });
  },

  // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature requires the destructure even with nothing pulled from it
  workerIndex: async ({}, use, testInfo) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(testInfo.workerIndex % WORKER_COUNT);
  },

  // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature requires the destructure even with nothing pulled from it
  storageStatePathForWorker: async ({}, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(storageStatePathFor);
  },

  cleanupSupabaseAsTestUser: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(async () => buildTestUserClient(page).catch(() => null));
  },
});

export { expect } from "@playwright/test";
