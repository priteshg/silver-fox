import { createClient } from "@supabase/supabase-js";
import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { resetFindingsFile } from "./support/findings";
import { WORKER_COUNT } from "./support/workerCount";

/**
 * Mints one anonymous Supabase session **per worker** (not one per test,
 * and — as of this optimization pass — not one shared session for the
 * whole run either). Two constraints, two different fixes:
 *
 * 1. Supabase enforces a default rate limit of 30 anonymous sign-ins per
 *    hour per IP. One sign-in per *test* blows through that in under 20
 *    tests. One sign-in per *worker* (`WORKER_COUNT`, currently 4) is 4
 *    sign-ins for the entire run — nowhere near the limit, even across
 *    several reruns in the same hour.
 * 2. Each anonymous sign-in leaves a permanent `auth.users` row behind
 *    (this suite has no service-role access to delete auth users). 4 rows
 *    per run instead of 1 is an acceptable, deliberate tradeoff for
 *    running the suite in parallel — see the parallelization section of
 *    E2E_PERFORMANCE_AUDIT.md for why a single shared session made
 *    `workers: 1` a hard requirement rather than a choice.
 *
 * Each worker's fixtures (see support/fixtures.ts) load exactly one of
 * these sessions, keyed by `workerInfo.workerIndex`, and reuse it across
 * every test that worker runs — RLS then guarantees one worker's data can
 * never collide with another's, so every existing spec's cleanup logic
 * (already scoped to "my own" Supabase user) needed no changes at all.
 *
 * As of the Stage 1 authentication work, the app itself no longer
 * establishes an anonymous session automatically on launch — a fresh page
 * load now shows the logged-out welcome screen, not Home. Confirmed
 * separately that this project's real Supabase instance requires email
 * confirmation before a sign-up grants a session, so "sign up through the
 * UI" cannot bootstrap an automated test session either. This still signs
 * in anonymously — `signInAnonymously` is unchanged and still produces a
 * real, RLS-scoped `auth.uid()` — it just does so directly via supabase-js
 * in Node, bypassing the app's UI entirely, then hands Playwright a
 * ready-made storage state per worker instead of relying on the app to
 * create one for itself on page load.
 */
export default async function globalSetup(config: FullConfig) {
  resetFindingsFile(); // every full suite run starts with a clean report — no stale findings from earlier iterations

  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:8081";
  const authDir = path.join(__dirname, ".auth");
  mkdirSync(authDir, { recursive: true });

  const env = Object.fromEntries(
    readFileSync(path.join(__dirname, "..", ".env"), "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      }),
  );
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

  const browser = await chromium.launch();
  try {
    // Sequential, not Promise.all: signInAnonymously against the same
    // project in a tight concurrent burst risks tripping the rate limit's
    // own burst detection even well under the hourly cap. 4 sequential
    // sign-ins add well under a second in total.
    for (let workerIndex = 0; workerIndex < WORKER_COUNT; workerIndex++) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (!data.session) throw new Error(`Anonymous sign-in for worker ${workerIndex} did not return a session.`);

      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      // Load the app once (unauthenticated — shows the welcome screen) purely
      // to get a same-origin page to write localStorage into; this key format
      // (`sb-<project-ref>-auth-token`) matches what @supabase/supabase-js
      // itself uses and reads back on next launch via AsyncStorage/localStorage.
      await page.goto(baseURL, { timeout: 60_000 });
      await page.evaluate(
        ({ key, session }) => window.localStorage.setItem(key, JSON.stringify(session)),
        { key: `sb-${projectRef}-auth-token`, session: data.session },
      );
      await page.reload();
      await page.getByText("Your Training Week").waitFor({ timeout: 45_000 });
      await context.storageState({ path: path.join(authDir, `state-${workerIndex}.json`) });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
