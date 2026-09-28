import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { WORKER_COUNT } from "./workerCount";

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

/** A unique marker embedded in every entity this run creates, so cleanup can find them by name/description regardless of id. */
export const RUN_TAG = `E2E_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

interface WorkerFixtures {
  /**
   * One browser context + page per worker, reused across every test in that
   * worker instead of a fresh context per test. A fresh context pays a full
   * cold boot every time (~11s: fetch the ~2MB bundle, parse, execute, real
   * Supabase queries for the Home screen) with zero cache reuse; reusing the
   * same page and resetting via `page.reload()` between tests reuses the
   * browser's already-parsed JS/HTTP cache, cutting that to ~0.5-1s — the
   * same speedup a same-page `reload()` already showed directly measured.
   */
  sharedContext: BrowserContext;
  sharedPage: Page;
}

interface TestFixtures {
  /** Reset to Home with a fresh app boot (via reload, not a new context) and the anonymous session established. */
  readyPage: Page;
  /** A supabase-js client authenticated as the SAME anonymous user the page is using, for direct cleanup/verification. */
  supabaseAsTestUser: SupabaseClient;
  /** Reads back every unhandled promise rejection captured since page load (see support/rejections.ts for why this beats page.on('pageerror')). */
  getUnhandledRejections: () => Promise<string[]>;
}

const AUTH_DIR = path.join(__dirname, "..", ".auth");
const SCREENSHOT_DIR = path.join(__dirname, "..", "..", "test-results", "screenshots");

/**
 * Each worker gets its own isolated anonymous Supabase user (see
 * global-setup.ts) instead of every worker sharing one — that's what makes
 * running with more than one worker safe: RLS guarantees worker A's writes
 * and cleanup can never touch worker B's rows, because they're different
 * `auth.uid()`s. `workerIndex % WORKER_COUNT` rather than a bare index
 * because Playwright's `workerIndex` can in principle exceed the
 * configured `workers` count across retries/reuse; global-setup only ever
 * creates `WORKER_COUNT` session files, so this keeps every worker mapped
 * to one that actually exists.
 */
function storageStatePathFor(workerIndex: number): string {
  return path.join(AUTH_DIR, `state-${workerIndex % WORKER_COUNT}.json`);
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sharedContext: [
    async ({ browser }, use, workerInfo) => {
      // Manually creating the context (instead of using Playwright's built-in
      // `context`/`page` fixtures) means the project's device config
      // (viewport, mobile emulation for mobile) isn't auto-applied —
      // merge it in explicitly. `project.use` also carries test-runner-only
      // options (actionTimeout, navigationTimeout, screenshot, trace, video)
      // that aren't valid BrowserContext constructor options — pull those
      // out separately rather than spreading them in.
      const { actionTimeout, navigationTimeout, screenshot, trace, video, storageState, ...contextOptions } =
        workerInfo.project.use;
      const context = await browser.newContext({
        ...contextOptions,
        storageState: storageStatePathFor(workerInfo.workerIndex),
      });
      context.setDefaultTimeout(actionTimeout ?? 5_000);
      context.setDefaultNavigationTimeout(navigationTimeout ?? 10_000);
      // Playwright's own test runner auto-starts tracing on any context
      // (not just its built-in fixtures) when `trace` is configured — the
      // per-test start/stopChunk in readyPage is what scopes a trace file to
      // a single test; calling tracing.start() here ourselves would conflict
      // with the runner's own already-active tracing session.
      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],

  sharedPage: [
    async ({ sharedContext }, use) => {
      const page = await sharedContext.newPage();
      // Installed once on the page; survives every later reload (this is a
      // single-page app — window/document persist across routes, only
      // re-running on an explicit page.reload(), which is exactly when this
      // needs to re-fire to reset the rejection log for the next test).
      await page.addInitScript(() => {
        (window as unknown as { __e2eRejections: string[] }).__e2eRejections = [];
        window.addEventListener("unhandledrejection", (event) => {
          let serialized: string;
          try {
            const reason = event.reason;
            serialized =
              reason instanceof Error
                ? `${reason.name}: ${reason.message}`
                : JSON.stringify(reason, Object.getOwnPropertyNames(reason ?? {}));
          } catch {
            serialized = String(event.reason);
          }
          (window as unknown as { __e2eRejections: string[] }).__e2eRejections.push(serialized);
        });
      });
      // Navigate once and wait for the app to fully settle before handing
      // off to the first test. Without waiting here, the first test's own
      // readyPage reset (goto + localStorage clear) could race this
      // navigation — either a strict-mode double-render from two overlapping
      // navigations, or (if this goto were removed entirely) a SecurityError
      // clearing localStorage on a still-blank page that's never navigated.
      await page.goto("/");
      await page.getByText("Your Training Week").waitFor({ timeout: 10_000 });
      await use(page);
      await page.close();
    },
    { scope: "worker" },
  ],

  readyPage: async ({ sharedPage, viewport }, use, testInfo) => {
    // Playwright's own `viewport` fixture still correctly resolves any
    // per-test/per-describe `test.use({ viewport })` override even though
    // we bypass its built-in `page`/`context` fixtures below — apply it
    // manually since a shared context can't pick that up on its own.
    if (viewport) await sharedPage.setViewportSize(viewport);

    // Reset state left by the previous test on this shared page, but keep
    // the shared Supabase session — clearing it would force a fresh
    // anonymous sign-in and reintroduce the 30/hour rate-limit problem this
    // suite's global-setup exists to avoid.
    await sharedPage.evaluate(() => {
      Object.keys(localStorage).forEach((key) => {
        if (!(key.startsWith("sb-") && key.endsWith("-auth-token"))) localStorage.removeItem(key);
      });
    });
    // `goto("/")` rather than `reload()`: reload() re-requests whatever URL
    // the previous test left the page on, which leaks navigation state
    // across tests. The speed win we measured (~1s vs ~11s) comes from
    // reusing this same warm context/cache, not from reload() specifically —
    // goto() on an already-warm page is equally fast.
    await sharedPage.goto("/");
    // SessionGate shows "Connecting..." then either the Home screen or an
    // error card; waiting for a Home-only landmark is the real "app ready"
    // signal, not just "the page responded".
    await expect(sharedPage.getByText("Your Training Week")).toBeVisible({ timeout: 10_000 });

    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(sharedPage);

    // Playwright's runner already auto-manages tracing.start/startChunk/
    // stopChunk per test for ANY context when `trace` is configured — not
    // just its own built-in fixtures — confirmed by this manually calling
    // startChunk erroring "Tracing has been already started", and
    // stopChunk erroring "Must start tracing before stopping" once removed
    // from one side. Doing it ourselves fights the runner's own bookkeeping,
    // so only screenshots (which are NOT auto-captured for a custom
    // context) are handled manually here.
    const failed = testInfo.status !== testInfo.expectedStatus;
    if (failed) {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
      const slug = testInfo.titlePath.join(" › ").replace(/[^a-z0-9]+/gi, "-").slice(0, 120);
      const screenshotPath = path.join(SCREENSHOT_DIR, `${slug}.png`);
      const screenshotBuffer = await sharedPage.screenshot({ path: screenshotPath }).catch(() => null);
      if (screenshotBuffer) await testInfo.attach("screenshot", { path: screenshotPath, contentType: "image/png" });
    }
  },

  getUnhandledRejections: async ({ readyPage }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(async () => readyPage.evaluate(() => (window as unknown as { __e2eRejections: string[] }).__e2eRejections));
  },

  supabaseAsTestUser: async ({ readyPage }, use) => {
    const storageKey = await readyPage.evaluate(() =>
      Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token")),
    );
    if (!storageKey) throw new Error("Could not find the app's Supabase session in localStorage after sign-in.");
    const raw = await readyPage.evaluate((key) => localStorage.getItem(key), storageKey);
    const session = JSON.parse(raw!);

    const client = createClient(env.url, env.anonKey);
    await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's own fixture `use`, not React's use()
    await use(client);
  },
});

export { expect };
